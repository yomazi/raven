// GmailEditor/GmailEditor.jsx

import { forwardMessage, replyToMessage, sendMessage } from "@api/gmail.api.js";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useState } from "react";
import { SEND_AS_ALIASES, SIGNATURES } from "../GmailPanel/GmailPanel_config.js";
import styles from "./GmailEditor.module.css";

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveInitialFields(mode, message) {
  if (!message) return { to: "", subject: "" };

  if (mode === "reply") {
    return {
      to: message.from ?? "",
      subject: message.subject?.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject ?? ""}`,
    };
  }

  if (mode === "replyAll") {
    const recipients = [message.from, message.to]
      .filter(Boolean)
      .flatMap((h) => h.split(",").map((a) => a.trim()))
      .filter((addr, i, arr) => addr && arr.indexOf(addr) === i)
      .join(", ");
    return {
      to: recipients,
      subject: message.subject?.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject ?? ""}`,
    };
  }

  if (mode === "forward") {
    return {
      to: "",
      subject: message.subject?.startsWith("Fwd:")
        ? message.subject
        : `Fwd: ${message.subject ?? ""}`,
    };
  }

  return { to: "", subject: "" };
}

function deriveInitialHtml(mode, message, showFolderId) {
  const folderBlock = showFolderId
    ? `<p>Here's the folder:<br/><a href="https://drive.google.com/drive/folders/${showFolderId}">https://drive.google.com/drive/folders/${showFolderId}</a></p>`
    : "";

  if (mode === "reply" && message?.body) {
    const quoted = stripHtml(message.body)
      .split("\n")
      .map((line) => `<p>&gt; ${line}</p>`)
      .join("");
    return `<p>Hey folks,</p><p></p><p></p><p></p>${folderBlock}<p></p><hr/>${quoted}`;
  }

  if (mode === "forward" && message) {
    const quotedBody = message.body ? stripHtml(message.body) : "";
    const header = [
      `<p>---------- Forwarded message ---------</p>`,
      `<p>From: ${message.from ?? ""}</p>`,
      `<p>Date: ${message.date ?? ""}</p>`,
      `<p>Subject: ${message.subject ?? ""}</p>`,
      `<p>To: ${message.to ?? ""}</p>`,
      `<p></p>`,
      ...quotedBody.split("\n").map((l) => `<p>${l}</p>`),
    ].join("");
    return `<p>Hey folks,</p><p></p><p></p><p></p>${folderBlock}<p></p><hr/>${header}`;
  }

  return `<p>Hey folks,</p><p></p><p></p><p></p>${folderBlock}`;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function EditorToolbar({ editor }) {
  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.toolBtnActive : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.toolBtnActive : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.toolBtnActive : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        ≡
      </button>
      <button
        className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.toolBtnActive : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1.
      </button>
      <div className={styles.toolDivider} />
      <button
        className={styles.toolBtn}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        ↩
      </button>
      <button
        className={styles.toolBtn}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        ↪
      </button>
    </div>
  );
}

// ─── GmailEditor ─────────────────────────────────────────────────────────────

const GmailEditor = ({ showFolderId, mode, message, onClose }) => {
  const initial = deriveInitialFields(mode, message);

  const [selectedAlias, setSelectedAlias] = useState(SEND_AS_ALIASES[0]);
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [sendState, setSendState] = useState("idle"); // "idle" | "busy" | "done" | "err"
  const [err, setErr] = useState(null);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Write your message…" })],
    content: deriveInitialHtml(mode, message, showFolderId),
    editorProps: {
      transformPastedHTML(html) {
        return html.replace(
          /color\s*:\s*(white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))[^;"]*/gi,
          ""
        );
      },
      handleKeyDown(view, event) {
        if (event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          document.querySelector("[data-send-btn]")?.focus();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(deriveInitialHtml(mode, message, showFolderId));
    editor.commands.focus("start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFolderId]);

  const handleSend = useCallback(async () => {
    if (!editor) return;
    setSendState("busy");
    setErr(null);
    const signature = mode === "new" ? (SIGNATURES[selectedAlias.address] ?? "") : "";
    const html = `${editor.getHTML()}${mode === "new" ? signature : ""}`;
    const formattedFrom = selectedAlias.address
      ? `${selectedAlias.name} <${selectedAlias.address}>`
      : null;

    const toAddresses = to
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if ((mode === "reply" || mode === "replyAll") && message?.id) {
        await replyToMessage(message.id, { body: html, from: formattedFrom });
      } else if (mode === "forward" && message?.id) {
        await forwardMessage(message.id, { to: toAddresses, body: html, from: formattedFrom });
      } else {
        await sendMessage({ to: toAddresses, subject, body: html, from: formattedFrom });
      }
      setSendState("done");
      setTimeout(() => onClose?.(), 1200);
    } catch (e) {
      setSendState("err");
      setErr(e.message);
    }
  }, [editor, selectedAlias, to, subject, mode, message, onClose]);

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.title}>
          {mode === "reply"
            ? "Reply"
            : mode === "replyAll"
              ? "Reply All"
              : mode === "forward"
                ? "Forward"
                : "New message"}
        </span>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        )}
      </div>

      {/* ── Fields ── */}
      <div className={styles.fields}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>From:</span>
          <select
            className={styles.fieldSelect}
            value={SEND_AS_ALIASES.indexOf(selectedAlias)}
            onChange={(e) => setSelectedAlias(SEND_AS_ALIASES[parseInt(e.target.value)])}
          >
            {SEND_AS_ALIASES.map((a, i) => (
              <option key={i} value={i}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>To:</span>
          <input
            className={styles.fieldInput}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
        {mode !== "reply" && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Subject:</span>
            <input
              className={styles.fieldInput}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── Editor ── */}
      <div className={styles.editorWrap}>
        <EditorContent editor={editor} className={styles.editor} />
      </div>

      {/* ── Footer ── */}
      {err && <div className={styles.err}>{err}</div>}
      <div className={styles.footer}>
        <button className={styles.ghostBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          data-send-btn
          className={`${styles.sendBtn} ${sendState === "busy" ? styles.sendBusy : ""}`}
          onClick={handleSend}
          disabled={sendState === "busy"}
        >
          {sendState === "busy" ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default GmailEditor;
