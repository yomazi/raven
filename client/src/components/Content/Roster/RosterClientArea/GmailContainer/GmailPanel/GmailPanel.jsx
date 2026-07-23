/**
 * GmailPanel.jsx  —  v6
 *
 * Right-side panel: reads Gmail threads (lazy-loaded per message), surfaces
 * all attachments grouped by message, uploads to Google Drive with config-driven
 * naming.
 *
 * Props:
 *   showFolderId string | undefined   — Drive folder id (the show's folder)
 *   rfcMessageId string | undefined   — RFC 822 Message-ID header of the message to open
 *   onCompose    ({ mode, message }) => void
 */

import { fetchMessage, fetchMessageByRfc822, fetchThread } from "@api/gmail.api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentRow } from "./AttachmentUpload.jsx";
import styles from "./GmailPanel.module.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortSender(from = "") {
  return from.replace(/<[^>]+>/, "").trim() || from;
}

// ─── MessageGroup ──────────────────────────────────────────────────────────────

function MessageGroup({
  stub,
  isFocused,
  folderId,
  contracts,
  marketingFolderId,
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
            <div className={styles.loadingRow} style={{ color: "var(--alert)" }}>
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
                        marketingFolderId={marketingFolderId}
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

export default function GmailPanel({ showFolderId, show, rfcMessageId, onCompose }) {
  const activeContracts = (show?.build?.contracts ?? []).filter((c) => !c.archived);
  const marketingFolderId = show?.drive?.folderIds?.marketingAssets ?? null;

  const [stubs, setStubs] = useState([]);
  const [soloMsg, setSoloMsg] = useState(null);
  const [resolvedMessageId, setResolvedMessageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedNames, setUploadedNames] = useState(new Map());

  useEffect(() => {
    let ignore = false;

    if (!rfcMessageId) {
      Promise.resolve().then(() => {
        if (ignore) return;
        setStubs([]);
        setSoloMsg(null);
        setResolvedMessageId(null);
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
        const msg = await fetchMessageByRfc822(rfcMessageId);
        if (ignore) return;
        setResolvedMessageId(msg.id);
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
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [rfcMessageId]);

  const handleUploaded = useCallback((key, result) => {
    setUploadedNames((prev) => new Map([...prev, [key, result]]));
  }, []);

  const messageStubs = stubs.length > 0 ? stubs : soloMsg ? [soloMsg] : [];
  const focusedId = resolvedMessageId ?? messageStubs[messageStubs.length - 1]?.id;
  const [selectedId, setSelectedId] = useState(focusedId);
  const focusedStub = messageStubs.find((m) => m.id === selectedId) ?? null;
  const uploadCount = uploadedNames.size;

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {rfcMessageId && (
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
          <div className={styles.stateRow} style={{ color: "var(--alert)" }}>
            Error: {error}
          </div>
        )}

        {!rfcMessageId && !loading && (
          <div className={styles.emptyState}>
            No message loaded.{"\n"}
            Open this view from a message in dragonfly,{"\n"}
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
            marketingFolderId={marketingFolderId}
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
