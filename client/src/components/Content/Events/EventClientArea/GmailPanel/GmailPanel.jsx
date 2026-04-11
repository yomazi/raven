/**
 * GmailPanel.jsx  —  v5
 *
 * Right-side panel: reads Gmail threads (lazy-loaded per message), surfaces
 * all attachments grouped by message, uploads to Google Drive with config-driven
 * naming, and sends smart-routed emails with automatic Gmail labeling.
 *
 * Props:
 *   showFolderId string | undefined   — Drive folder id (the show's folder)
 *
 * Route params (via useParams):
 *   threadId     string | undefined
 *   messageId    string | undefined
 *
 * ─── API routes ───────────────────────────────────────────────────────────────
 *   GET  /api/v1/gmail/threads/:threadId
 *   GET  /api/v1/gmail/messages/:messageId
 *   GET  /api/v1/gmail/attachments/:messageId/:attachmentId
 *   POST /api/v1/gmail/messages/send
 *   POST /api/v1/gmail/messages/:messageId/reply
 *   POST /api/v1/gmail/messages/:messageId/forward
 *   GET  /api/v1/drive/folders/:folderId/files
 *   POST /api/v1/drive/upload
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./GmailPanel.module.css";
import {
  DOCTYPES,
  SEND_AS_ALIASES,
  TEAMS,
  buildPrefix,
  computeNextVersion,
  deriveRouting,
  getStageOptions,
} from "./GmailPanel_config.js";

const BASE_URL = "/api/v1";
const ATTACHMENT_MODE = "stream"; // "stream" | "signed"

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

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── NamingForm ───────────────────────────────────────────────────────────────

function NamingForm({ att, messageId, folderId, onUploaded, onCancel }) {
  const [team, setTeam] = useState(TEAMS[0].code);
  const [doctypeKey, setDoctypeKey] = useState(() => (DOCTYPES[TEAMS[0].code] ?? [])[0]?.key ?? "");
  const [subtype, setSubtype] = useState("");
  const [customSubtype, setCustomSubtype] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [customPaymentType, setCustomPaymentType] = useState("");
  const [stage, setStage] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [folderFiles, setFolderFiles] = useState(null);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  const doctypeOptions = DOCTYPES[team] ?? [];
  const doctypeConfig = doctypeOptions.find((d) => d.key === doctypeKey) ?? null;
  const stageOptions = getStageOptions(doctypeConfig);
  const hasSubtypes = !!doctypeConfig?.subtypes;
  const hasPaymentTypes = !!doctypeConfig?.paymentTypes;
  const effectiveSubtype = subtype === "__custom__" ? customSubtype : subtype;
  const effectivePaymentType = paymentType === "__custom__" ? customPaymentType : paymentType;

  const prevTeam = useRef(team);
  useEffect(() => {
    if (prevTeam.current === team) return;
    prevTeam.current = team;
    const options = DOCTYPES[team] ?? [];
    const firstKey = options[0]?.key ?? "";
    const firstStage =
      getStageOptions(options.find((d) => d.key === firstKey) ?? null)[0]?.value ?? "";
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
    setSubtype("");
    setCustomSubtype("");
    setPaymentType("");
    setCustomPaymentType("");
    setStage(opts[0]?.value ?? "");
  }, [doctypeKey, team]);

  useEffect(() => {
    if (!folderId) return;
    setLoadingFolder(true);
    apiFetch(`/drive/folders/${folderId}/files`)
      .then((data) => setFolderFiles(data.files.map((f) => f.name)))
      .catch(() => setFolderFiles([]))
      .finally(() => setLoadingFolder(false));
  }, [folderId]);

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

    setSuggestedName(name);
    setEditedName(name);
  }, [team, doctypeKey, effectiveSubtype, effectivePaymentType, stage, folderFiles, att.filename]);

  const handleUpload = useCallback(async () => {
    if (!editedName.trim()) {
      setErr("Filename cannot be empty.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      let blob;
      if (ATTACHMENT_MODE === "signed") {
        const { url } = await apiFetch(`/gmail/attachments/${messageId}/${att.attachmentId}`);
        blob = await fetch(url).then((r) => r.blob());
      } else {
        const r = await fetch(`${BASE_URL}/gmail/attachments/${messageId}/${att.attachmentId}`);
        if (!r.ok) throw new Error("Download failed");
        blob = await r.blob();
      }
      const fd = new FormData();
      fd.append("file", blob, editedName.trim());
      fd.append("filename", editedName.trim());
      fd.append("mimeType", att.mimeType);
      fd.append("folderId", folderId);
      const r2 = await fetch(`${BASE_URL}/drive/upload`, { method: "POST", body: fd });
      if (!r2.ok) throw new Error("Upload failed");
      onUploaded(editedName.trim());
    } catch (e) {
      setErr(e.message);
      setUploading(false);
    }
  }, [editedName, att, messageId, folderId, onUploaded]);

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
          disabled={uploading || loadingFolder}
        >
          {uploading ? "Uploading…" : "Upload to Drive"}
        </button>
      </div>
    </div>
  );
}

// ─── AttachmentRow ─────────────────────────────────────────────────────────────

function AttachmentRow({ att, messageId, folderId, uploadKey, uploadedNames, onUploaded }) {
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
          onUploaded={handleUploaded}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─── RoutingPreview ────────────────────────────────────────────────────────────
// Shows derived routing before the user confirms send.

function RoutingPreview({ uploadedNames, mode, onConfirm, onCancel }) {
  const uploadedFilenames = [...uploadedNames.values()];
  const routing = deriveRouting(uploadedFilenames);

  // Editable To: — pre-populated from routing, empty if none derived
  const [to, setTo] = useState(routing.toAddresses.join(", "));
  const [from, setFrom] = useState(SEND_AS_ALIASES[0].address ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const hasRouting = routing.toAddresses.length > 0;

  return (
    <div className={styles.drawer}>
      <div className={styles.drawerHeader}>
        <span className={styles.drawerTitle}>
          {mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New message"}
        </span>
        <button className={styles.iconBtn} onClick={onCancel}>
          ✕
        </button>
      </div>

      {/* Routing summary */}
      {uploadedFilenames.length > 0 && (
        <div className={styles.routingBox}>
          <div className={styles.routingLabel}>Smart routing</div>
          {hasRouting ? (
            <div className={styles.routingDetail}>
              Routed from {uploadedFilenames.length} uploaded file
              {uploadedFilenames.length !== 1 ? "s" : ""}
            </div>
          ) : (
            <div className={`${styles.routingDetail} ${styles.orange}`}>
              No team routing — fill in recipients manually
            </div>
          )}
          {routing.receivedLabels.length > 0 && (
            <div className={styles.routingPills}>
              <span className={styles.routingPillHead}>Received thread:</span>
              {routing.receivedLabels.map((l) => (
                <span key={l} className={styles.routingPill}>
                  {l}
                </span>
              ))}
            </div>
          )}
          {routing.sentLabelstyles.length > 0 && (
            <div className={styles.routingPills}>
              <span className={styles.routingPillHead}>Sent message:</span>
              {routing.sentLabels.map((l) => (
                <span key={l} className={styles.routingPill}>
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* From */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>From</span>
        <select
          className={styles.fieldSelect}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        >
          {SEND_AS_ALIASES.map((a, i) => (
            <option key={i} value={a.address ?? ""}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* To */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>To</span>
        <input
          className={styles.fieldInput}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@example.com"
        />
      </div>

      {/* Subject — only for new messages */}
      {mode === "new" && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Subject</span>
          <input
            className={styles.fieldInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      )}

      <textarea
        className={styles.bodyArea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        rows={5}
        autoFocus
      />

      <div className={styles.drawerActions}>
        <button className={styles.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={styles.sendBtn}
          onClick={() =>
            onConfirm({
              to: to
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              from: from || null,
              subject,
              body,
              threadLabels: routing.receivedLabels,
              sentLabels: routing.sentLabels,
            })
          }
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── ComposeDrawer ─────────────────────────────────────────────────────────────

function ComposeDrawer({ mode, message, messageId, uploadedNames, onClose, onSent }) {
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);

  const handleConfirm = useCallback(
    async ({ to, from, subject, body, threadLabels, sentLabels }) => {
      setState("busy");
      setErr(null);
      try {
        if (mode === "reply" && message?.id) {
          await apiFetch(`/gmail/messages/${message.id}/reply`, {
            method: "POST",
            body: JSON.stringify({ body, from: from || undefined, threadLabels, sentLabels }),
          });
        } else if (mode === "forward" && message?.id) {
          await apiFetch(`/gmail/messages/${message.id}/forward`, {
            method: "POST",
            body: JSON.stringify({ to, body, from: from || undefined, threadLabels, sentLabels }),
          });
        } else {
          // New message: send first, then label the received thread separately
          await apiFetch(`/gmail/messages/send`, {
            method: "POST",
            body: JSON.stringify({ to, subject, body, from: from || undefined, sentLabels }),
          });
          if (threadLabels?.length && messageId) {
            await apiFetch(`/gmail/messages/${messageId}/label`, {
              method: "POST",
              body: JSON.stringify({ labels: threadLabels }),
            });
          }
        }
        setState("done");
        setTimeout(onSent, 800);
      } catch (e) {
        setState("err");
        setErr(e.message);
      }
    },
    [mode, message, messageId, onSent]
  );

  if (state === "done") {
    return (
      <div className={styles.drawer} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#166534", fontSize: 13, fontWeight: 600 }}>Sent!</div>
      </div>
    );
  }

  return (
    <>
      {err && (
        <div className={styles.errText} style={{ margin: "0 14px" }}>
          {err}
        </div>
      )}
      <RoutingPreview
        uploadedNames={uploadedNames}
        mode={mode}
        onConfirm={handleConfirm}
        onCancel={onClose}
      />
    </>
  );
}

// ─── MessageGroup ──────────────────────────────────────────────────────────────

function MessageGroup({ stub, isFocused, folderId, uploadedNames, onUploaded, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const loaded = useRef(false);

  const fetchMessage = useCallback(() => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    apiFetch(`/gmail/messages/${stub.id}`)
      .then(setMsg)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [stub.id]);

  useEffect(() => {
    if (defaultOpen) fetchMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expand = useCallback(() => {
    setOpen(true);
    fetchMessage();
  }, [fetchMessage]);
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
        </div>
      )}
    </div>
  );
}

// ─── Dragonfly ────────────────────────────────────────────────────────────────

export default function Dragonfly({ showFolderId }) {
  const { threadId: rawThreadId, messageId: rawMessageId } = useParams();

  // Gmail web UI uses decimal IDs (thread-f:NNN / msg-f:NNN)
  // The Gmail API requires hexadecimal IDs
  const toHex = (id) => (id ? BigInt(id).toString(16) : undefined);

  const threadId = rawThreadId ? toHex(rawThreadId.replace(/^thread-f:/, "")) : undefined;
  const messageId = rawMessageId ? toHex(rawMessageId.replace(/^msg-f:/, "")) : undefined;

  const [stubs, setStubs] = useState([]);
  const [soloMsg, setSoloMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compose, setCompose] = useState(null); // null | "reply" | "forward" | "new"
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

    Promise.resolve().then(() => {
      if (ignore) return;
      setLoading(true);
      setError(null);

      if (threadId) {
        apiFetch(`/gmail/threads/${threadId}`)
          .then((data) => {
            if (!ignore) {
              setStubs(data.messages ?? []);
              setSoloMsg(null);
            }
          })
          .catch((e) => {
            if (!ignore) setError(e.message);
          })
          .finally(() => {
            if (!ignore) setLoading(false);
          });
      } else {
        apiFetch(`/gmail/messages/${messageId}`)
          .then((data) => {
            if (!ignore) {
              setSoloMsg(data);
              setStubs([]);
            }
          })
          .catch((e) => {
            if (!ignore) setError(e.message);
          })
          .finally(() => {
            if (!ignore) setLoading(false);
          });
      }
    });

    return () => {
      ignore = true;
    };
  }, [threadId, messageId]);

  const handleUploaded = useCallback((key, finalName) => {
    setUploadedNames((prev) => new Map([...prev, [key, finalName]]));
  }, []);

  const messageStubs = stubs.length > 0 ? stubs : soloMsg ? [soloMsg] : [];
  const focusedId = messageId ?? messageStubs[messageStubs.length - 1]?.id;
  const focusedStub = messageStubs.find((m) => m.id === focusedId) ?? null;
  const uploadCount = uploadedNames.size;

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarRight}>
          {focusedStub && (
            <>
              <button className={styles.iconChip} title="Reply" onClick={() => setCompose("reply")}>
                ↩
              </button>
              <button
                className={styles.iconChip}
                title="Forward"
                onClick={() => setCompose("forward")}
              >
                →
              </button>
            </>
          )}
          <button className={styles.iconChip} title="New message" onClick={() => setCompose("new")}>
            ✉
          </button>
        </div>
      </div>

      {/* ── Context bar ── */}
      {(threadId || messageId) && (
        <div className={styles.contextBar}>
          <div className={styles.pills}>
            {threadId && <span className={styles.pill}>thread {threadId}</span>}
            {messageId && <span className={styles.pill}>msg {messageId}</span>}
          </div>
          {uploadCount > 0 && <span className={styles.attSummary}>{uploadCount} uploaded</span>}
        </div>
      )}

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
            isFocused={stub.id === focusedId}
            folderId={showFolderId}
            uploadedNames={uploadedNames}
            onUploaded={handleUploaded}
            defaultOpen={stub.id === focusedId || messageStubs.length === 1}
          />
        ))}
      </div>

      {/* ── Compose drawer ── */}
      {compose && (
        <ComposeDrawer
          mode={compose}
          message={focusedStub}
          messageId={messageId}
          uploadedNames={uploadedNames}
          onClose={() => setCompose(null)}
          onSent={() => setCompose(null)}
        />
      )}
    </div>
  );
}
