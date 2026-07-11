/**
 * GmailPanel.jsx  —  v6
 *
 * Right-side panel: reads Gmail threads (lazy-loaded per message), surfaces
 * all attachments grouped by message, uploads to Google Drive with config-driven
 * naming.
 *
 * Props:
 *   showFolderId string | undefined   — Drive folder id (the show's folder)
 *   threadId     string | undefined
 *   messageId    string | undefined
 *   onCompose    ({ mode, message }) => void
 */

import { createContractFolder, uploadToDrive } from "@api/drive.api.js";
import { fetchAttachment, fetchDriveFiles, fetchMessage, fetchThread } from "@api/gmail.api.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./GmailPanel.module.css";
import {
  DOCTYPES,
  TEAMS,
  buildPrefix,
  computeNextVersion,
  getStageOptions,
} from "./GmailPanel_config.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extBadge(filename) {
  return (filename?.split(".").pop()?.toUpperCase() ?? "?").slice(0, 4);
}

function shortSender(from = "") {
  return from.replace(/<[^>]+>/, "").trim() || from;
}

// ─── NamingForm ───────────────────────────────────────────────────────────────

// "contract" and "offer" documents belong in a specific contract's Drive
// subfolder rather than the show's root — this decides whether that
// target-folder picker should show for the current team/doctype selection.
function needsContractFolder(team, doctypeKey) {
  return team === "prg" && (doctypeKey === "contract" || doctypeKey === "offer");
}

// The two effects below only fire on a *change* to team/doctypeKey (each
// compares against a ref seeded with the current value) — they never run on
// mount, so `stage`'s initial value has to be computed the same way here,
// otherwise it silently stays "" (while the <select> visually shows the
// first option anyway, since a controlled value with no matching option
// falls back to it) and filename generation skips the stage/version segment.
const DEFAULT_TEAM = TEAMS[0].code;
const DEFAULT_DOCTYPE_KEY = (DOCTYPES[DEFAULT_TEAM] ?? [])[0]?.key ?? "";
const DEFAULT_STAGE =
  getStageOptions((DOCTYPES[DEFAULT_TEAM] ?? []).find((d) => d.key === DEFAULT_DOCTYPE_KEY) ?? null)[0]
    ?.value ?? "";

function NamingForm({ att, messageId, folderId, contracts = [], onUploaded, onCancel }) {
  const [team, setTeam] = useState(DEFAULT_TEAM);
  const [doctypeKey, setDoctypeKey] = useState(DEFAULT_DOCTYPE_KEY);
  const [subtype, setSubtype] = useState("");
  const [customSubtype, setCustomSubtype] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [customPaymentType, setCustomPaymentType] = useState("");
  const [stage, setStage] = useState(DEFAULT_STAGE);
  const [suggestedName, setSuggestedName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [folderFiles, setFolderFiles] = useState(null);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const [contractFolderId, setContractFolderId] = useState("");
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [newSigneeName, setNewSigneeName] = useState("");
  const queryClient = useQueryClient();

  const doctypeOptions = DOCTYPES[team] ?? [];
  const doctypeConfig = doctypeOptions.find((d) => d.key === doctypeKey) ?? null;
  const stageOptions = getStageOptions(doctypeConfig);
  const hasSubtypes = !!doctypeConfig?.subtypes;
  const hasPaymentTypes = !!doctypeConfig?.paymentTypes;
  const effectiveSubtype = subtype === "__custom__" ? customSubtype : subtype;
  const effectivePaymentType = paymentType === "__custom__" ? customPaymentType : paymentType;

  // Shown for contract/offer doctypes even with zero existing contracts —
  // that's exactly the case where you need "+ New contract…" to create one
  // without leaving the upload flow.
  const showsContractPicker = needsContractFolder(team, doctypeKey);
  // Auto-select the only contract when there's just one; otherwise require a choice.
  useEffect(() => {
    if (!showsContractPicker) {
      setContractFolderId("");
      setIsCreatingContract(false);
    } else if (contracts.length === 1) {
      setContractFolderId(contracts[0].folderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showsContractPicker, contracts.length]);

  const targetFolderId = showsContractPicker ? contractFolderId || null : folderId;
  const canUpload = isCreatingContract ? newSigneeName.trim().length > 0 : !!targetFolderId;

  const prevTeam = useRef(team);
  useEffect(() => {
    if (prevTeam.current === team) return;
    prevTeam.current = team;
    const options = DOCTYPES[team] ?? [];
    const firstKey = options[0]?.key ?? "";
    const firstStage =
      getStageOptions(options.find((d) => d.key === firstKey) ?? null)[0]?.value ?? "";

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setDoctypeKey(firstKey);
    setSubtype("");
    setCustomSubtype("");
    setPaymentType("");
    setCustomPaymentType("");
    setStage(firstStage);
  }, [team]);

  const prevDoctypeKey = useRef(doctypeKey);
  useEffect(() => {
    if (prevDoctypeKey.current === doctypeKey) return;
    prevDoctypeKey.current = doctypeKey;
    const opts = getStageOptions(DOCTYPES[team]?.find((d) => d.key === doctypeKey) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setSubtype("");
    setCustomSubtype("");
    setPaymentType("");
    setCustomPaymentType("");
    setStage(opts[0]?.value ?? "");
  }, [doctypeKey, team]);

  useEffect(() => {
    if (isCreatingContract) {
      // No folder yet, but it'll be brand new (and therefore empty) once
      // created on upload — preview the filename against an empty folder
      // now instead of waiting for a real one to exist.
      setFolderFiles([]);
      return;
    }
    if (!targetFolderId) {
      setFolderFiles(null);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setLoadingFolder(true);
    fetchDriveFiles(targetFolderId)
      .then((files) => setFolderFiles(files.map((f) => f.name)))
      .catch(() => setFolderFiles([]))
      .finally(() => setLoadingFolder(false));
  }, [targetFolderId, isCreatingContract]);

  useEffect(() => {
    if (!doctypeKey || folderFiles === null) return;
    const config = (DOCTYPES[team] ?? []).find((d) => d.key === doctypeKey) ?? null;
    const stageOpts = getStageOptions(config);
    const stageObj = stageOpts.find((o) => o.value === stage) ?? null;
    const needsVersion = stageObj?.versioned === true || config?.stages === "numbered";

    const prefixNoVersion = buildPrefix({
      team,
      doctype: doctypeKey,
      subtype: effectiveSubtype,
      paymentType: effectivePaymentType,
      stage,
      version: null,
    });

    let name;
    if (needsVersion) {
      const version = computeNextVersion(folderFiles, prefixNoVersion);
      const finalPrefix = buildPrefix({
        team,
        doctype: doctypeKey,
        subtype: effectiveSubtype,
        paymentType: effectivePaymentType,
        stage,
        version,
      });
      name = `${finalPrefix} - ${att.filename}`;
    } else {
      name = `${prefixNoVersion} - ${att.filename}`;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setSuggestedName(name);
    setEditedName(name);
  }, [team, doctypeKey, effectiveSubtype, effectivePaymentType, stage, folderFiles, att.filename]);

  const handleUpload = useCallback(async () => {
    if (isCreatingContract && !newSigneeName.trim()) {
      setErr("Enter a signee name for the new contract.");
      return;
    }
    if (!editedName.trim()) {
      setErr("Filename cannot be empty.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      // Creating a new contract is folded into this same click — no separate
      // "Create" step first — so the folder only needs to exist by the time
      // we're actually about to upload into it.
      let uploadFolderId = targetFolderId;
      if (isCreatingContract) {
        const result = await createContractFolder(folderId, newSigneeName.trim());
        if (result.show) {
          queryClient.setQueryData(["show", folderId], result.show);
        }
        uploadFolderId = result.folderId;
        setContractFolderId(result.folderId);
        setIsCreatingContract(false);
        setNewSigneeName("");
      }

      const blob = await fetchAttachment(messageId, att.attachmentId);
      await uploadToDrive({
        blob,
        filename: editedName.trim(),
        mimeType: att.mimeType,
        folderId: uploadFolderId,
      });
      onUploaded(editedName.trim());
    } catch (e) {
      setErr(e.message);
      setUploading(false);
    }
  }, [
    isCreatingContract,
    newSigneeName,
    editedName,
    att,
    messageId,
    targetFolderId,
    folderId,
    queryClient,
    onUploaded,
  ]);

  return (
    <div className={styles.namingForm}>
      <div className={styles.nRow}>
        <div className={styles.nField}>
          <span className={styles.nLabel}>Team</span>
          <select className={styles.nSelect} value={team} onChange={(e) => setTeam(e.target.value)}>
            {TEAMS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.nField}>
          <span className={styles.nLabel}>Document type</span>
          {doctypeOptions.length > 0 ? (
            <select
              className={styles.nSelect}
              value={doctypeKey}
              onChange={(e) => setDoctypeKey(e.target.value)}
            >
              {doctypeOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={styles.nInput}
              value={doctypeKey}
              onChange={(e) => setDoctypeKey(e.target.value)}
              placeholder="doctype"
            />
          )}
        </div>
      </div>

      {showsContractPicker && (
        <div className={styles.nRow}>
          <div className={`${styles.nField} ${styles.flexOne}`}>
            <span className={styles.nLabel}>Contract</span>
            <select
              className={styles.nSelect}
              value={isCreatingContract ? "__new__" : contractFolderId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  setContractFolderId("");
                  setIsCreatingContract(true);
                } else {
                  setIsCreatingContract(false);
                  setContractFolderId(val);
                }
              }}
            >
              <option value="" disabled>
                — select a contract —
              </option>
              {contracts.map((c) => (
                <option key={c._id} value={c.folderId}>
                  {c.signee}
                </option>
              ))}
              <option value="__new__">+ New contract…</option>
            </select>
          </div>

          {isCreatingContract && (
            <div className={`${styles.nField} ${styles.flexOne}`}>
              <span className={styles.nLabel}>Signee name</span>
              <input
                className={styles.nInput}
                value={newSigneeName}
                onChange={(e) => setNewSigneeName(e.target.value)}
                placeholder="Artist or management firm…"
                onKeyDown={(e) => e.key === "Enter" && canUpload && handleUpload()}
                autoFocus
              />
              <span className={styles.nHint}>Creates the contract folder and uploads into it.</span>
            </div>
          )}
        </div>
      )}

      {hasSubtypes && (
        <div className={styles.nRow}>
          <div className={`${styles.nField} ${styles.flexOne}`}>
            <span className={styles.nLabel}>Rider type</span>
            <select
              className={styles.nSelect}
              value={subtype}
              onChange={(e) => {
                setSubtype(e.target.value);
                if (e.target.value !== "__custom__") setCustomSubtype("");
              }}
            >
              <option value="">— select —</option>
              {doctypeConfig.subtypes.known.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              {doctypeConfig.subtypes.custom && <option value="__custom__">Other…</option>}
            </select>
          </div>
          {subtype === "__custom__" && (
            <div className={`${styles.nField} ${styles.flexOne}`}>
              <span className={styles.nLabel}>Custom type</span>
              <input
                className={styles.nInput}
                value={customSubtype}
                onChange={(e) => setCustomSubtype(e.target.value)}
                placeholder="e.g. catering"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {hasPaymentTypes && (
        <div className={styles.nRow}>
          <div className={`${styles.nField} ${styles.flexOne}`}>
            <span className={styles.nLabel}>Payment type</span>
            <select
              className={styles.nSelect}
              value={paymentType}
              onChange={(e) => {
                setPaymentType(e.target.value);
                if (e.target.value !== "__custom__") setCustomPaymentType("");
              }}
            >
              <option value="">— select —</option>
              {doctypeConfig.paymentTypes.known.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              {doctypeConfig.paymentTypes.custom && <option value="__custom__">Other…</option>}
            </select>
          </div>
          {paymentType === "__custom__" && (
            <div className={`${styles.nField} ${styles.flexOne}`}>
              <span className={styles.nLabel}>Custom type</span>
              <input
                className={styles.nInput}
                value={customPaymentType}
                onChange={(e) => setCustomPaymentType(e.target.value)}
                placeholder="e.g. hotel buyout"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {stageOptions.length > 0 && (
        <div className={styles.nRow}>
          <div className={`${styles.nField} ${styles.flexOne}`}>
            <span className={styles.nLabel}>Stage</span>
            <select
              className={styles.nSelect}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={styles.nPreviewWrap}>
        <span className={styles.nLabel}>Filename</span>
        {loadingFolder ? (
          <span className={styles.nHint}>Scanning folder…</span>
        ) : (
          <input
            className={styles.nPreviewInput}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
      {editedName !== suggestedName && suggestedName && (
        <button className={styles.nResetBtn} onClick={() => setEditedName(suggestedName)}>
          Reset to suggested
        </button>
      )}

      {err && <div className={styles.errText}>{err}</div>}

      <div className={styles.nActions}>
        <button className={styles.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={`${styles.sendBtn} ${uploading ? styles.sendBusy : null}`}
          onClick={handleUpload}
          disabled={uploading || loadingFolder || !canUpload}
          title={
            !canUpload
              ? isCreatingContract
                ? "Enter a signee name"
                : "Select a contract to upload to"
              : undefined
          }
        >
          {uploading
            ? isCreatingContract
              ? "Creating contract…"
              : "Uploading…"
            : "Upload to Drive"}
        </button>
      </div>
    </div>
  );
}

// ─── AttachmentRow ─────────────────────────────────────────────────────────────

function AttachmentRow({ att, messageId, folderId, contracts, uploadKey, uploadedNames, onUploaded }) {
  const [showForm, setShowForm] = useState(false);
  const isDone = uploadedNames.has(uploadKey);

  const handleUploaded = useCallback(
    (finalName) => {
      onUploaded(uploadKey, finalName);
      setShowForm(false);
    },
    [uploadKey, onUploaded]
  );

  return (
    <div className={styles.attWrap}>
      <div className={styles.attRow}>
        <div className={styles.attBadge}>{extBadge(att.filename)}</div>
        <div className={styles.attInfo}>
          <div className={styles.attName} title={att.filename}>
            {att.filename}
          </div>
          <div className={styles.attMeta}>
            {att.mimeType} · {formatBytes(att.size)}
          </div>
          {isDone && <div className={styles.uploadedAs}>✓ {uploadedNames.get(uploadKey)}</div>}
        </div>
        {!isDone && (
          <button
            className={`${styles.chipBtn} ${showForm ? styles.chipActive : null}`}
            onClick={() => setShowForm((f) => !f)}
            title={folderId ? "Upload to Drive" : "No folder selected"}
            disabled={!folderId}
          >
            ↑
          </button>
        )}
        {isDone && <div className={`${styles.chipBtn} ${styles.chipDone}`}>✓</div>}
      </div>
      {showForm && !isDone && (
        <NamingForm
          att={att}
          messageId={messageId}
          folderId={folderId}
          contracts={contracts}
          onUploaded={handleUploaded}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─── MessageGroup ──────────────────────────────────────────────────────────────

function MessageGroup({
  stub,
  isFocused,
  folderId,
  contracts,
  uploadedNames,
  onUploaded,
  defaultOpen,
  onCompose,
  onSelect,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const loaded = useRef(false);

  const loadMessage = useCallback(() => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    fetchMessage(stub.id)
      .then(setMsg)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [stub.id]);

  useEffect(() => {
    if (defaultOpen) loadMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expand = useCallback(() => {
    setOpen(true);
    loadMessage();
    onSelect?.();
  }, [loadMessage, onSelect]);

  const toggle = useCallback(() => {
    if (!open) expand();
    else setOpen(false);
  }, [open, expand]);

  const attachments = msg?.attachments ?? [];

  return (
    <div className={`${styles.msgGroup} ${isFocused ? styles.msgGroupFocused : null}`}>
      <button className={styles.groupHeader} onClick={toggle}>
        <div className={styles.groupHeaderLeft}>
          <span className={styles.groupChevron}>{open ? "▾" : "▸"}</span>
          <div className={styles.groupMeta}>
            <span className={styles.groupFrom}>{shortSender(stub.from)}</span>
            {isFocused && <span className={styles.focusedPill}>focused</span>}
            <span className={styles.groupDate}>{formatDate(stub.date)}</span>
          </div>
        </div>
        {msg && attachments.length > 0 && (
          <span className={styles.groupAttCount}>
            {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.groupBody}>
          {loading && <div className={styles.loadingRow}>Loading…</div>}
          {err && (
            <div className={styles.loadingRow} style={{ color: "#b91c1c" }}>
              {err}
            </div>
          )}
          {msg && (
            <>
              {msg.snippet && <div className={styles.groupSnippet}>{msg.snippet}</div>}
              {attachments.length > 0 ? (
                <div className={styles.attList}>
                  {attachments.map((att) => {
                    const key = `${msg.id}::${att.attachmentId}`;
                    return (
                      <AttachmentRow
                        key={key}
                        att={att}
                        messageId={msg.id}
                        folderId={folderId}
                        contracts={contracts}
                        uploadKey={key}
                        uploadedNames={uploadedNames}
                        onUploaded={onUploaded}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noAtts}>No attachments in this message</div>
              )}
            </>
          )}
          {isFocused && msg && (
            <div className={styles.msgActions}>
              <button
                className={styles.msgActionBtn}
                onClick={() => onCompose({ mode: "reply", message: msg })}
              >
                ↩ Reply
              </button>
              <button
                className={styles.msgActionBtn}
                onClick={() => onCompose({ mode: "replyAll", message: msg })}
              >
                ↩ Reply All
              </button>
              <button
                className={styles.msgActionBtn}
                onClick={() => onCompose({ mode: "forward", message: msg })}
              >
                → Forward
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GmailPanel ────────────────────────────────────────────────────────────────

export default function GmailPanel({
  showFolderId,
  show,
  threadId: rawThreadId,
  messageId: rawMessageId,
  onCompose,
}) {
  const activeContracts = (show?.build?.contracts ?? []).filter((c) => !c.archived);
  // Gmail permalink ids come as e.g. "thread-f:123" or "msg-f:123", where
  // the number is the id's plain decimal form (convert straight to hex for
  // the API). Some links instead use "thread-a:r-123" / "msg-a:r-123" —
  // that "a:r-" scheme is not a simple twos-complement encoding of the
  // same id (confirmed by comparing a decoded "thread-a:r-" value against
  // the real threadId Gmail returns for the matching message: they don't
  // match), so we can't reliably decode it here.
  //
  // Because the route always carries a messageId alongside the threadId,
  // we sidestep this: below, the thread is resolved from the *message's*
  // own threadId (as reported by the Gmail API), not from this decoded
  // value. This raw decode is kept only as a fallback for the case where
  // a threadId shows up with no messageId to anchor off of.
  const gmailIdToHex = (id) => {
    if (!id) return undefined;
    const match = /^(?:thread|msg)-[a-z]+:(\d+)$/.exec(id);
    const digits = match ? match[1] : id;
    try {
      return BigInt(digits).toString(16);
    } catch {
      return undefined;
    }
  };

  const threadId = gmailIdToHex(rawThreadId);
  const messageId = gmailIdToHex(rawMessageId);

  const [stubs, setStubs] = useState([]);
  const [soloMsg, setSoloMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedNames, setUploadedNames] = useState(new Map());

  useEffect(() => {
    let ignore = false;

    if (!threadId && !messageId) {
      Promise.resolve().then(() => {
        if (ignore) return;
        setStubs([]);
        setSoloMsg(null);
        setError(null);
        setLoading(false);
      });
      return () => {
        ignore = true;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (messageId) {
          // Resolve the thread off the message's own threadId (as reported
          // by the Gmail API) rather than the URL's threadId — see the note
          // on gmailIdToHex above for why that value can't be trusted.
          const msg = await fetchMessage(messageId);
          if (ignore) return;
          try {
            const thread = await fetchThread(msg.threadId);
            if (!ignore) {
              setStubs(thread.messages ?? []);
              setSoloMsg(null);
            }
          } catch {
            if (!ignore) {
              setStubs([]);
              setSoloMsg(msg);
            }
          }
        } else {
          const thread = await fetchThread(threadId);
          if (!ignore) {
            setStubs(thread.messages ?? []);
            setSoloMsg(null);
          }
        }
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [threadId, messageId]);

  const handleUploaded = useCallback((key, finalName) => {
    setUploadedNames((prev) => new Map([...prev, [key, finalName]]));
  }, []);

  const messageStubs = stubs.length > 0 ? stubs : soloMsg ? [soloMsg] : [];
  const focusedId = messageId ?? messageStubs[messageStubs.length - 1]?.id;
  const [selectedId, setSelectedId] = useState(focusedId);
  const focusedStub = messageStubs.find((m) => m.id === selectedId) ?? null;
  const uploadCount = uploadedNames.size;

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {(threadId || messageId) && (
          <div className={styles.uploads}>
            {uploadCount > 0 && <span>{uploadCount} file(s) uploaded</span>}
          </div>
        )}
        <div className={styles.toolbarRight}>
          {focusedStub && (
            <>
              <button
                className={styles.iconChip}
                title="Reply"
                onClick={() => onCompose({ mode: "reply", message: focusedStub })}
              >
                ↩
              </button>
              <button
                className={styles.iconChip}
                title="Forward"
                onClick={() => onCompose({ mode: "forward", message: focusedStub })}
              >
                →
              </button>
            </>
          )}
          <button
            className={styles.iconChip}
            title="New message"
            onClick={() => onCompose({ mode: "new", message: null })}
          >
            ✉
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {loading && <div className={styles.stateRow}>Loading…</div>}
        {error && (
          <div className={styles.stateRow} style={{ color: "#b91c1c" }}>
            Error: {error}
          </div>
        )}

        {!threadId && !messageId && !loading && (
          <div className={styles.emptyState}>
            No message loaded.{"\n"}
            Pass a <code className={styles.code}>threadId</code> or{" "}
            <code className={styles.code}>messageId</code>,{"\n"}
            or compose a new email above.
          </div>
        )}

        {focusedStub && (
          <div className={styles.threadSubject}>{focusedStub.subject ?? "(no subject)"}</div>
        )}

        {!showFolderId && messageStubs.length > 0 && (
          <div className={styles.folderWarning}>Select a Drive folder to enable uploads</div>
        )}

        {messageStubs.map((stub) => (
          <MessageGroup
            key={stub.id}
            stub={stub}
            isFocused={stub.id === selectedId}
            folderId={showFolderId}
            contracts={activeContracts}
            uploadedNames={uploadedNames}
            onUploaded={handleUploaded}
            defaultOpen={stub.id === focusedId || messageStubs.length === 1}
            onCompose={onCompose}
            onSelect={() => setSelectedId(stub.id)}
          />
        ))}
      </div>
    </div>
  );
}
