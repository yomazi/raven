/**
 * Dragonfly.jsx  —  v4
 *
 * Right-side panel: reads Gmail threads (lazy-loaded per message), surfaces
 * all attachments grouped by message, and uploads to Google Drive with a
 * config-driven naming scheme previewed and editable before each upload.
 *
 * Props:
 *   threadId         string | undefined
 *   messageId        string | undefined
 *   showFolderId     string | undefined
 *
 * ─── API routes ───────────────────────────────────────────────────────────────
 *
 *   GET /api/gmail/threads/:threadId
 *   → { id, messages: [{ id, subject, from, to, date, snippet }] }
 *     (message stubs only — no body or attachments yet)
 *
 *   GET /api/gmail/messages/:messageId
 *   → { id, threadId, subject, from, to, date, snippet, body?,
 *       attachments: [{ attachmentId, filename, mimeType, size }] }
 *
 *   GET /api/gmail/attachments/:messageId/:attachmentId
 *   → binary stream  (set ATTACHMENT_MODE = "signed" to return { url } instead)
 *
 *   POST /api/gmail/messages/:messageId/reply    { body }
 *   POST /api/gmail/messages/:messageId/forward  { to, body }
 *   POST /api/gmail/messages/send                { to, subject, body }
 *
 *   GET  /api/drive/folders/:folderId/files
 *   → { files: [{ id, name, mimeType }] }
 *
 *   POST /api/drive/upload
 *   multipart FormData: file, filename (renamed), mimeType, folderId
 *
 * ─── OAuth scopes ─────────────────────────────────────────────────────────────
 *   https://www.googleapis.com/auth/gmail.readonly
 *   https://www.googleapis.com/auth/gmail.send
 *   https://www.googleapis.com/auth/drive.file
 *
 * ─── Naming logic ─────────────────────────────────────────────────────────────
 *   See DRAGONFLY_CONFIG.js — all taxonomy lives there.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DOCTYPES,
  TEAMS,
  buildPrefix,
  computeNextVersion,
  getStageOptions,
} from "./DRAGONFLY_CONFIG.js";

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
    throw new Error(e.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── NamingForm ───────────────────────────────────────────────────────────────
// Shown inline in the attachment row when user clicks ↑.
// Scans the Drive folder, suggests a filename, lets user edit, then uploads.

function NamingForm({ att, messageId, folderId, onUploaded, onCancel }) {
  const [team, setTeam] = useState(TEAMS[0].code);
  const [doctypeKey, setDoctypeKey] = useState("");
  const [subtype, setSubtype] = useState("");
  const [customSubtype, setCustomSubtype] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [customPaymentType, setCustomPaymentType] = useState("");
  const [stage, setStage] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [folderFiles, setFolderFiles] = useState(null); // null = not loaded yet
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  // Derived config
  const doctypeOptions = DOCTYPES[team] ?? [];
  const doctypeConfig = doctypeOptions.find((d) => d.key === doctypeKey) ?? null;
  const stageOptions = getStageOptions(doctypeConfig);
  const hasSubtypes = !!doctypeConfig?.subtypes;
  const hasPaymentTypes = !!doctypeConfig?.paymentTypes;

  const effectiveSubtype = subtype === "__custom__" ? customSubtype : subtype;
  const effectivePaymentType = paymentType === "__custom__" ? customPaymentType : paymentType;

  // When team changes, reset doctype and everything downstream.
  // A ref guards against running on the initial render.
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

  // When doctype changes, reset sub-selections and stage.
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

  // Fetch folder files once (shared across all NamingForms via prop, but each form fetches independently)
  useEffect(() => {
    if (!folderId) return;
    setLoadingFolder(true);
    apiFetch(`/drive/folders/${folderId}/files`)
      .then((data) => setFolderFiles(data.files.map((f) => f.name)))
      .catch(() => setFolderFiles([]))
      .finally(() => setLoadingFolder(false));
  }, [folderId]);

  // Recompute suggested name whenever selections change.
  // isVersioned/isNumbered are derived inline here rather than as variables above
  // so the dep array stays complete without phantom dependencies.
  useEffect(() => {
    if (!doctypeKey || folderFiles === null) return;

    const config = (DOCTYPES[team] ?? []).find((d) => d.key === doctypeKey) ?? null;
    const stageOpts = getStageOptions(config);
    const stageObj = stageOpts.find((o) => o.value === stage) ?? null;
    const needsVersion = stageObj?.versioned === true || config?.stages === "numbered";

    let name;
    if (needsVersion) {
      const prefixNoVersion = buildPrefix({
        team,
        doctype: doctypeKey,
        subtype: effectiveSubtype,
        paymentType: effectivePaymentType,
        stage,
        version: null,
      });
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
      const basePrefix = buildPrefix({
        team,
        doctype: doctypeKey,
        subtype: effectiveSubtype,
        paymentType: effectivePaymentType,
        stage,
        version: null,
      });
      name = `${basePrefix} - ${att.filename}`;
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
    <div style={s.namingForm}>
      {/* Row 1: Team + Doctype */}
      <div style={s.nRow}>
        <div style={s.nField}>
          <span style={s.nLabel}>Team</span>
          <select style={s.nSelect} value={team} onChange={(e) => setTeam(e.target.value)}>
            {TEAMS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div style={s.nField}>
          <span style={s.nLabel}>Document type</span>
          {doctypeOptions.length > 0 ? (
            <select
              style={s.nSelect}
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
              style={s.nInput}
              value={doctypeKey}
              onChange={(e) => setDoctypeKey(e.target.value)}
              placeholder="doctype"
            />
          )}
        </div>
      </div>

      {/* Row 2: Subtype (riders) */}
      {hasSubtypes && (
        <div style={s.nRow}>
          <div style={{ ...s.nField, flex: 1 }}>
            <span style={s.nLabel}>Rider type</span>
            <select
              style={s.nSelect}
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
            <div style={{ ...s.nField, flex: 1 }}>
              <span style={s.nLabel}>Custom type</span>
              <input
                style={s.nInput}
                value={customSubtype}
                onChange={(e) => setCustomSubtype(e.target.value)}
                placeholder="e.g. catering"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Row 3: Payment type */}
      {hasPaymentTypes && (
        <div style={s.nRow}>
          <div style={{ ...s.nField, flex: 1 }}>
            <span style={s.nLabel}>Payment type</span>
            <select
              style={s.nSelect}
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
            <div style={{ ...s.nField, flex: 1 }}>
              <span style={s.nLabel}>Custom type</span>
              <input
                style={s.nInput}
                value={customPaymentType}
                onChange={(e) => setCustomPaymentType(e.target.value)}
                placeholder="e.g. hotel buyout"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Row 4: Stage */}
      {stageOptions.length > 0 && (
        <div style={s.nRow}>
          <div style={{ ...s.nField, flex: 1 }}>
            <span style={s.nLabel}>Stage</span>
            <select style={s.nSelect} value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Generated filename preview */}
      <div style={s.nPreviewWrap}>
        <span style={s.nLabel}>Filename</span>
        {loadingFolder ? (
          <span style={s.nHint}>Scanning folder…</span>
        ) : (
          <input
            style={s.nPreviewInput}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
      {editedName !== suggestedName && suggestedName && (
        <button style={s.nResetBtn} onClick={() => setEditedName(suggestedName)}>
          Reset to suggested
        </button>
      )}

      {err && <div style={s.errText}>{err}</div>}

      {/* Actions */}
      <div style={s.nActions}>
        <button style={s.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          style={{ ...s.sendBtn, ...(uploading ? s.sendBusy : {}) }}
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
    <div style={s.attWrap}>
      <div style={s.attRow}>
        <div style={s.attBadge}>{extBadge(att.filename)}</div>
        <div style={s.attInfo}>
          <div style={s.attName} title={att.filename}>
            {att.filename}
          </div>
          <div style={s.attMeta}>
            {att.mimeType} · {formatBytes(att.size)}
          </div>
          {isDone && <div style={s.uploadedAs}>✓ {uploadedNames.get(uploadKey)}</div>}
        </div>
        {!isDone && (
          <button
            style={{ ...s.chipBtn, ...(showForm ? s.chipActive : {}) }}
            onClick={() => setShowForm((f) => !f)}
            title={folderId ? "Upload to Drive" : "No folder selected"}
            disabled={!folderId}
          >
            ↑
          </button>
        )}
        {isDone && <div style={{ ...s.chipBtn, ...s.chipDone }}>✓</div>}
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

// ─── MessageGroup ──────────────────────────────────────────────────────────────
// Lazy-loads full message data on expand.

function MessageGroup({ stub, isFocused, folderId, uploadedNames, onUploaded, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [msg, setMsg] = useState(null); // full message, loaded on expand
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

  // Auto-expand on mount when defaultOpen is true.
  // useEffect runs after render; fetchMessage's setState calls are async (.then),
  // so the setState-in-effect lint rule does not apply here.
  useEffect(() => {
    if (defaultOpen) fetchMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — we only want this to fire once on mount

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
    <div style={{ ...s.msgGroup, ...(isFocused ? s.msgGroupFocused : {}) }}>
      <button style={s.groupHeader} onClick={toggle}>
        <div style={s.groupHeaderLeft}>
          <span style={s.groupChevron}>{open ? "▾" : "▸"}</span>
          <div style={s.groupMeta}>
            <span style={s.groupFrom}>{shortSender(stub.from)}</span>
            {isFocused && <span style={s.focusedPill}>focused</span>}
            <span style={s.groupDate}>{formatDate(stub.date)}</span>
          </div>
        </div>
        {msg && attachments.length > 0 && (
          <span style={s.groupAttCount}>
            {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div style={s.groupBody}>
          {loading && <div style={s.loadingRow}>Loading…</div>}
          {err && <div style={{ ...s.loadingRow, color: "#b91c1c" }}>{err}</div>}
          {msg && (
            <>
              {msg.snippet && <div style={s.groupSnippet}>{msg.snippet}</div>}
              {attachments.length > 0 ? (
                <div style={s.attList}>
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
                <div style={s.noAtts}>No attachments in this message</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ComposeDrawer ─────────────────────────────────────────────────────────────

function ComposeDrawer({ mode, message, onClose, onSent }) {
  const [to, setTo] = useState(mode === "reply" ? (message?.from ?? "") : "");
  const [subject, setSubject] = useState(
    mode === "new"
      ? ""
      : mode === "forward"
        ? `Fwd: ${message?.subject ?? ""}`
        : `Re: ${message?.subject ?? ""}`
  );
  const [body, setBody] = useState(
    (mode === "reply" || mode === "forward") && message
      ? `\n\n— ${message.from}, ${formatDate(message.date)} —\n${message.snippet ?? ""}`
      : ""
  );
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const send = useCallback(async () => {
    setState("busy");
    setErr(null);
    try {
      if (mode === "reply" && message?.id) {
        await apiFetch(`/gmail/messages/${message.id}/reply`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
      } else if (mode === "forward" && message?.id) {
        await apiFetch(`/gmail/messages/${message.id}/forward`, {
          method: "POST",
          body: JSON.stringify({ to, body }),
        });
      } else {
        await apiFetch(`/gmail/messages/send`, {
          method: "POST",
          body: JSON.stringify({ to, subject, body }),
        });
      }
      setState("done");
      setTimeout(onSent, 800);
    } catch (e) {
      setState("err");
      setErr(e.message);
    }
  }, [mode, message, to, subject, body, onSent]);

  return (
    <div style={s.drawer}>
      <div style={s.drawerHeader}>
        <span style={s.drawerTitle}>
          {mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New message"}
        </span>
        <button style={s.iconBtn} onClick={onClose}>
          ✕
        </button>
      </div>
      {(mode === "forward" || mode === "new") && (
        <div style={s.field}>
          <span style={s.fieldLabel}>To</span>
          <input
            style={s.fieldInput}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="address@example.com"
          />
        </div>
      )}
      {mode === "new" && (
        <div style={s.field}>
          <span style={s.fieldLabel}>Subject</span>
          <input
            style={s.fieldInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      )}
      <textarea
        ref={bodyRef}
        style={s.bodyArea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        rows={5}
      />
      {err && <div style={s.errText}>{err}</div>}
      <div style={s.drawerActions}>
        <button style={s.ghostBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          style={{
            ...s.sendBtn,
            ...(state === "busy" ? s.sendBusy : {}),
            ...(state === "done" ? s.sendDone : {}),
          }}
          onClick={send}
          disabled={state === "busy" || state === "done"}
        >
          {state === "done" ? "Sent!" : state === "busy" ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Dragonfly ────────────────────────────────────────────────────────────────

export default function Dragonfly({ showFolderId }) {
  const { threadId, messageId } = useParams();

  const [stubs, setStubs] = useState([]); // thread message stubs
  const [soloMsg, setSoloMsg] = useState(null); // fallback when only messageId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compose, setCompose] = useState(null);
  // Map of uploadKey → final uploaded filename
  const [uploadedNames, setUploadedNames] = useState(new Map());

  useEffect(() => {
    let ignore = false;

    // No props — clear everything. Batched into one setState call via a reducer-style
    // approach: we set each piece inside a microtask so React can batch them.
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

  // Normalise: always work with an array of stubs
  const messageStubs = stubs.length > 0 ? stubs : soloMsg ? [soloMsg] : [];
  const focusedId = messageId ?? messageStubs[messageStubs.length - 1]?.id;
  const focusedStub = messageStubs.find((m) => m.id === focusedId) ?? null;
  const uploadCount = uploadedNames.size;

  return (
    <div style={s.root}>
      {/* ── Toolbar ── */}
      <div style={s.toolbar}>
        <span style={s.wordmark}>✦ Dragonfly</span>
        <div style={s.toolbarRight}>
          {focusedStub && (
            <>
              <button style={s.iconChip} title="Reply" onClick={() => setCompose("reply")}>
                ↩
              </button>
              <button style={s.iconChip} title="Forward" onClick={() => setCompose("forward")}>
                →
              </button>
            </>
          )}
          <button style={s.iconChip} title="New message" onClick={() => setCompose("new")}>
            ✉
          </button>
        </div>
      </div>

      {/* ── Context bar ── */}
      {(threadId || messageId) && (
        <div style={s.contextBar}>
          <div style={s.pills}>
            {threadId && <span style={s.pill}>thread {threadId}</span>}
            {messageId && <span style={s.pill}>msg {messageId}</span>}
          </div>
          {uploadCount > 0 && <span style={s.attSummary}>{uploadCount} uploaded</span>}
        </div>
      )}

      {/* ── Body ── */}
      <div style={s.body}>
        {loading && <div style={s.stateRow}>Loading…</div>}
        {error && <div style={{ ...s.stateRow, color: "#b91c1c" }}>Error: {error}</div>}

        {!threadId && !messageId && !loading && (
          <div style={s.emptyState}>
            No message loaded.{"\n"}
            Pass a <code style={s.code}>threadId</code> or <code style={s.code}>messageId</code>,
            {"\n"}
            or compose a new email above.
          </div>
        )}

        {focusedStub && <div style={s.threadSubject}>{focusedStub.subject ?? "(no subject)"}</div>}

        {!showFolderId && messageStubs.length > 0 && (
          <div style={s.folderWarning}>Select a Drive folder to enable uploads</div>
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
          onClose={() => setCompose(null)}
          onSent={() => setCompose(null)}
        />
      )}
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    color: "#1a1a1a",
    background: "#fafafa",
    borderLeft: "1px solid #e8e8e8",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #ebebeb",
    background: "#fff",
    flexShrink: 0,
  },
  wordmark: { fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em", color: "#111" },
  toolbarRight: { display: "flex", gap: 4 },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    fontSize: 13,
    padding: "3px 6px",
    borderRadius: 4,
    lineHeight: 1,
  },
  iconChip: {
    background: "none",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    color: "#555",
    fontSize: 13,
    padding: "3px 9px",
    borderRadius: 6,
    lineHeight: 1,
  },
  contextBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 14px",
    borderBottom: "1px solid #ebebeb",
    background: "#fff",
    flexShrink: 0,
    gap: 8,
  },
  pills: { display: "flex", gap: 5, flexWrap: "wrap", flex: 1, minWidth: 0 },
  pill: {
    fontSize: 10,
    fontFamily: "monospace",
    background: "#f2f2f2",
    border: "1px solid #e5e5e5",
    borderRadius: 99,
    padding: "2px 7px",
    color: "#888",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 140,
  },
  attSummary: { fontSize: 11, color: "#166534", whiteSpace: "nowrap", flexShrink: 0 },
  body: { flex: 1, overflowY: "auto", paddingBottom: 16 },
  stateRow: { padding: "24px 14px", textAlign: "center", color: "#999", fontSize: 12 },
  emptyState: {
    padding: "32px 20px",
    textAlign: "center",
    color: "#aaa",
    fontSize: 12,
    lineHeight: 1.8,
    whiteSpace: "pre-line",
  },
  code: {
    fontFamily: "monospace",
    fontSize: 11,
    background: "#f0f0f0",
    borderRadius: 3,
    padding: "1px 4px",
    color: "#555",
  },
  threadSubject: {
    padding: "12px 14px 4px",
    fontWeight: 600,
    fontSize: 14,
    color: "#111",
    lineHeight: 1.3,
  },
  folderWarning: {
    margin: "6px 14px 2px",
    padding: "5px 10px",
    fontSize: 11,
    color: "#92400e",
    background: "#fef3c7",
    borderRadius: 6,
  },
  msgGroup: {
    margin: "6px 10px",
    border: "1px solid #ebebeb",
    borderRadius: 8,
    background: "#fff",
    overflow: "hidden",
  },
  msgGroupFocused: { border: "1px solid #c7d2fe", background: "#fafbff" },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "8px 10px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    gap: 8,
  },
  groupHeaderLeft: { display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  groupChevron: { fontSize: 10, color: "#bbb", flexShrink: 0 },
  groupMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    flex: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },
  groupFrom: {
    fontWeight: 500,
    fontSize: 12,
    color: "#222",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
  },
  focusedPill: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    background: "#e0e7ff",
    color: "#3730a3",
    borderRadius: 99,
    padding: "1px 5px",
    flexShrink: 0,
  },
  groupDate: { fontSize: 10, color: "#bbb", whiteSpace: "nowrap" },
  groupAttCount: { fontSize: 10, color: "#999", whiteSpace: "nowrap", flexShrink: 0 },
  groupBody: { borderTop: "1px solid #f0f0f0", padding: "8px 10px" },
  loadingRow: { fontSize: 11, color: "#aaa", padding: "4px 0" },
  groupSnippet: {
    fontSize: 11,
    color: "#888",
    lineHeight: 1.5,
    marginBottom: 8,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  attList: { display: "flex", flexDirection: "column", gap: 6 },
  noAtts: { fontSize: 11, color: "#ccc", textAlign: "center", padding: "6px 0" },

  // Attachment row
  attWrap: { display: "flex", flexDirection: "column", gap: 0 },
  attRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    background: "#fafafa",
    border: "1px solid #f0f0f0",
    borderRadius: 6,
  },
  attBadge: {
    width: 30,
    height: 30,
    borderRadius: 5,
    background: "#eef0ff",
    color: "#3730a3",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  attInfo: { flex: 1, minWidth: 0 },
  attName: {
    fontWeight: 500,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#222",
  },
  attMeta: { fontSize: 10, color: "#bbb", marginTop: 1 },
  uploadedAs: { fontSize: 10, color: "#166534", marginTop: 2, wordBreak: "break-all" },
  errText: { fontSize: 11, color: "#b91c1c", marginTop: 3 },
  chipBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    cursor: "pointer",
    color: "#555",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { border: "1px solid #a5b4fc", background: "#eef2ff", color: "#3730a3" },
  chipDone: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    cursor: "default",
  },

  // Naming form
  namingForm: {
    margin: "4px 0 0",
    padding: "10px 10px 8px",
    background: "#f5f5ff",
    border: "1px solid #c7d2fe",
    borderRadius: "0 0 6px 6px",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  nRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  nField: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 100 },
  nLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  nSelect: {
    fontSize: 12,
    border: "1px solid #ddd",
    borderRadius: 5,
    padding: "4px 6px",
    background: "#fff",
    color: "#111",
    outline: "none",
  },
  nInput: {
    fontSize: 12,
    border: "1px solid #ddd",
    borderRadius: 5,
    padding: "4px 6px",
    background: "#fff",
    color: "#111",
    outline: "none",
  },
  nPreviewWrap: { display: "flex", flexDirection: "column", gap: 3 },
  nPreviewInput: {
    fontSize: 11,
    fontFamily: "monospace",
    border: "1px solid #c7d2fe",
    borderRadius: 5,
    padding: "5px 7px",
    background: "#fff",
    color: "#3730a3",
    outline: "none",
    wordBreak: "break-all",
  },
  nHint: { fontSize: 11, color: "#aaa", fontStyle: "italic" },
  nResetBtn: {
    fontSize: 10,
    color: "#6366f1",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
    textDecoration: "underline",
  },
  nActions: { display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 2 },

  // Compose drawer
  drawer: {
    borderTop: "1px solid #e0e0e0",
    background: "#fff",
    padding: "12px 14px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  drawerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  drawerTitle: { fontWeight: 600, fontSize: 12, color: "#333" },
  field: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: 5,
  },
  fieldLabel: { fontSize: 11, color: "#bbb", width: 44, flexShrink: 0, fontWeight: 500 },
  fieldInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 12,
    color: "#111",
    background: "transparent",
    padding: "2px 0",
  },
  bodyArea: {
    width: "100%",
    border: "1px solid #eee",
    borderRadius: 6,
    padding: "7px 9px",
    fontSize: 12,
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
    color: "#111",
    boxSizing: "border-box",
    minHeight: 90,
  },
  drawerActions: { display: "flex", justifyContent: "flex-end", gap: 6 },
  ghostBtn: {
    background: "none",
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    color: "#777",
  },
  sendBtn: {
    background: "#4f46e5",
    border: "none",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: "#fff",
  },
  sendBusy: { opacity: 0.6, cursor: "not-allowed" },
  sendDone: { background: "#166534" },
};
