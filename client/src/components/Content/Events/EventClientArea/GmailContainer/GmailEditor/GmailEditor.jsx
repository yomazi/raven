// GmailEditor/GmailEditor.jsx

import { forwardMessage, replyToMessage, sendMessage } from "@api/gmail.api.js";
import { useContacts } from "@hooks/useContacts.js";
import { useDriveFiles } from "@hooks/useDriveFiles.js";
import { useGroups } from "@hooks/useGroups.js";
import useRavenStore from "@store/useRavenStore.js";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GMAIL_LABELS, SEND_AS_ALIASES, SIGNATURES } from "../GmailPanel/GmailPanel_config.js";
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

// Matches the text shown in the show Banner (and its "copy" action), so the
// default subject line always names the same show the client area is on.
function formatBannerText(show) {
  if (!show) return "";
  const date = show.date
    ? new Date(show.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  return [show.artist, date && `(${date})`].filter(Boolean).join(" ");
}

// Keeps exactly one trailing ":" on the subject prefix, however it was typed.
function withTrailingColon(text) {
  const trimmed = text.replace(/[:\s]+$/, "");
  return trimmed ? `${trimmed}:` : "";
}

// ─── Recipient helpers ──────────────────────────────────────────────────────

function parseRecipients(to) {
  return to
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatRecipient(contact) {
  return `${contact.name} <${contact.email}>`;
}

function hasEmail(recipients, email) {
  return recipients.some((r) => r.toLowerCase().includes(email.toLowerCase()));
}

function isEveryEmailPresent(recipients, people) {
  return people.length > 0 && people.every((p) => hasEmail(recipients, p.email));
}

function findGroupByName(groups, name) {
  return groups.find((g) => g.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function findContactByName(contacts, name) {
  return contacts.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
}

// ─── Label helpers ──────────────────────────────────────────────────────────

// Which team/contact being present in "To:" triggers which Gmail label —
// independent of how the recipient got there (quick-pick, "more recipients",
// or typed by hand), since it's derived from the final "To:" contents.
const GROUP_LABELS = {
  Finance: GMAIL_LABELS.FIN,
  Production: GMAIL_LABELS.PROD,
  "Audience Services": GMAIL_LABELS.AUD,
  Marketing: GMAIL_LABELS.MKT,
};

const CONTACT_LABELS = {
  "Par Neiburger": GMAIL_LABELS.PRG,
  "PC Muñoz": GMAIL_LABELS.PRG,
};

function deriveSentLabels(to, groups, contacts) {
  const recipients = parseRecipients(to);
  const labels = new Set();

  for (const group of groups) {
    const label = GROUP_LABELS[group.name];
    if (label && (group.contacts ?? []).some((c) => hasEmail(recipients, c.email))) {
      labels.add(label);
    }
  }

  for (const contact of contacts) {
    const label = CONTACT_LABELS[contact.name];
    if (label && hasEmail(recipients, contact.email)) {
      labels.add(label);
    }
  }

  return [...labels];
}

// ─── RecipientPicker ────────────────────────────────────────────────────────

function RecipientPicker({ to, onChange }) {
  const { data: groups = [] } = useGroups();
  const { data: contacts = [] } = useContacts();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    // EventGrid installs its own Escape handler on `window` with
    // { capture: true } and calls stopPropagation(), which stops the event
    // before it ever reaches `document` — so ours has to live on the same
    // node/phase to still be called (stopPropagation doesn't block other
    // listeners on the same target, only propagation to other targets).
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    // Tell EventGrid to skip its own Escape-clears-filter shortcut while
    // this dropdown is open, so closing it doesn't also clear the grid filter.
    useRavenStore.getState().setSuppressGridEscapeClear(true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      useRavenStore.getState().setSuppressGridEscapeClear(false);
    };
  }, [expanded]);

  const quickPicks = useMemo(() => {
    const finance = findGroupByName(groups, "Finance")?.contacts ?? [];
    const production = findGroupByName(groups, "Production")?.contacts ?? [];
    const audienceServices = findGroupByName(groups, "Audience Services")?.contacts ?? [];
    const par = findContactByName(contacts, "Par Neiburger");
    const pc = findContactByName(contacts, "PC Muñoz");

    return [
      { label: "Finance", people: finance },
      { label: "Production + Audience Services", people: [...production, ...audienceServices] },
      { label: "Par", people: par ? [par] : [] },
      { label: "PC", people: pc ? [pc] : [] },
    ];
  }, [groups, contacts]);

  function togglePeople(people) {
    if (people.length === 0) return;
    const current = parseRecipients(to);
    const allPresent = isEveryEmailPresent(current, people);

    const next = allPresent
      ? current.filter((r) => !people.some((p) => r.toLowerCase().includes(p.email.toLowerCase())))
      : [...current, ...people.filter((p) => !hasEmail(current, p.email)).map(formatRecipient)];

    onChange(next.join(", "));
  }

  const currentList = parseRecipients(to);

  return (
    <div className={styles.recipientPicker}>
      <div className={styles.quickPicks}>
        {quickPicks.map((pick) => (
          <button
            key={pick.label}
            type="button"
            className={styles.quickPickBtn}
            data-active={isEveryEmailPresent(currentList, pick.people) || undefined}
            onClick={() => togglePeople(pick.people)}
            disabled={pick.people.length === 0}
            title={pick.people.length === 0 ? `"${pick.label}" not found in Contacts` : undefined}
          >
            {pick.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.moreBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          More recipients {expanded ? "▴" : "▾"}
        </button>
      </div>

      {expanded && (
        <div className={styles.moreList}>
          {groups.map((group) => (
            <label key={group._id} className={styles.moreRow}>
              <input
                type="checkbox"
                checked={isEveryEmailPresent(currentList, group.contacts ?? [])}
                onChange={() => togglePeople(group.contacts ?? [])}
              />
              <span className={styles.moreName}>{group.name}</span>
              <span className={styles.moreHint}>group</span>
            </label>
          ))}
          {contacts.map((contact) => (
            <label key={contact._id} className={styles.moreRow}>
              <input
                type="checkbox"
                checked={hasEmail(currentList, contact.email)}
                onChange={() => togglePeople([contact])}
              />
              <span className={styles.moreName}>{contact.name}</span>
              <span className={styles.moreHint}>{contact.email}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AttachmentPicker ───────────────────────────────────────────────────────

// Show-folder files are named "<naming-convention prefix> - <real name>"
// (see GmailPanel_config.js's buildPrefix); an attachment should only ever
// carry the part after that first " - " separator.
function stripNamingConvention(filename) {
  const idx = filename.indexOf(" - ");
  return idx === -1 ? filename : filename.slice(idx + 3);
}

// Folder options for the attachment picker: the show's root folder, its
// Marketing Assets subfolder (if created), and each active contract's
// subfolder — mirrors the folder layout shows actually have on Drive.
function useAttachmentFolderOptions(showFolderId, show) {
  const options = [{ id: showFolderId, label: "Show folder" }];

  const marketingAssetsId = show?.drive?.folderIds?.marketingAssets;
  if (marketingAssetsId) {
    options.push({ id: marketingAssetsId, label: "Marketing Assets" });
  }

  for (const contract of show?.build?.contracts ?? []) {
    if (contract.archived) continue;
    options.push({ id: contract.folderId, label: contract.folderName });
  }

  return options;
}

function AttachmentPicker({ showFolderId, show, attachments, onChange }) {
  const folderOptions = useAttachmentFolderOptions(showFolderId, show);
  const [selectedFolderId, setSelectedFolderId] = useState(showFolderId);

  useEffect(() => {
    setSelectedFolderId(showFolderId);
  }, [showFolderId]);

  const { data: allFiles = [] } = useDriveFiles(selectedFolderId);
  // Only PDFs are supported as attachments for now — Google Docs/Sheets/Slides
  // aren't real downloadable files without an export step we don't need yet.
  const files = allFiles.filter((f) => f.mimeType === "application/pdf");

  function handleSelect(e) {
    const fileId = e.target.value;
    e.target.value = "";
    if (!fileId) return;

    const file = files.find((f) => f.id === fileId);
    if (!file || attachments.some((a) => a.driveFileId === file.id)) return;

    onChange([
      ...attachments,
      { driveFileId: file.id, filename: stripNamingConvention(file.name), mimeType: file.mimeType },
    ]);
  }

  function removeAttachment(driveFileId) {
    onChange(attachments.filter((a) => a.driveFileId !== driveFileId));
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Attach:</span>
      <div className={styles.attachmentPicker}>
        {folderOptions.length > 1 && (
          <select
            className={styles.fieldSelect}
            value={selectedFolderId ?? ""}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            disabled={!showFolderId}
          >
            {folderOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        <select
          className={styles.fieldSelect}
          value=""
          onChange={handleSelect}
          disabled={!showFolderId}
        >
          <option value="" disabled>
            {showFolderId ? "Attach a PDF…" : "No show folder selected"}
          </option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        {attachments.length > 0 && (
          <div className={styles.attachmentChips}>
            {attachments.map((a) => (
              <span key={a.driveFileId} className={styles.attachmentChip}>
                {a.filename}
                <button
                  type="button"
                  className={styles.attachmentRemoveBtn}
                  onClick={() => removeAttachment(a.driveFileId)}
                  title="Remove attachment"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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

const GmailEditor = ({ showFolderId, show, mode, message, onClose }) => {
  const initial = deriveInitialFields(mode, message);
  const isNew = mode === "new";

  const { data: groups = [] } = useGroups();
  const { data: contacts = [] } = useContacts();

  const [selectedAlias, setSelectedAlias] = useState(SEND_AS_ALIASES[0]);
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [subjectPrefix, setSubjectPrefix] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ driveFileId, filename, mimeType }]
  const [sendState, setSendState] = useState("idle"); // "idle" | "busy" | "done" | "err"
  const [err, setErr] = useState(null);

  // For a brand-new message, keep the subject in sync with "<prefix>: <show>"
  // until the user types directly into the Subject field. The prefix field
  // itself stays exactly what was typed — the colon is only ever added here,
  // to the derived subject, never written back into subjectPrefix.
  useEffect(() => {
    if (!isNew || subjectTouched) return;
    const bannerText = formatBannerText(show);
    const prefixOutput = withTrailingColon(subjectPrefix);
    setSubject([prefixOutput, bannerText].filter(Boolean).join(" "));
  }, [isNew, subjectTouched, subjectPrefix, show]);

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

  // Switching to a different show shouldn't carry over recipients, the
  // subject prefix, or attachments picked for the previous show's folder.
  // For a brand-new message, `subject` is intentionally left alone here —
  // it's owned exclusively by the auto-sync effect above, which already
  // reacts to `show` changing; setting it here too raced with that effect
  // and could leave the subject blank depending on subjectTouched's prior
  // value (it only overwrites-back-to-correct when subjectTouched actually
  // flips, which isn't guaranteed).
  useEffect(() => {
    const freshInitial = deriveInitialFields(mode, message);
    setTo(freshInitial.to);
    setSubjectPrefix("");
    setSubjectTouched(false);
    if (!isNew) setSubject(freshInitial.subject);
    setAttachments([]);
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

    const sentLabels = deriveSentLabels(to, groups, contacts);

    try {
      if ((mode === "reply" || mode === "replyAll") && message?.id) {
        await replyToMessage(message.id, { body: html, from: formattedFrom, attachments, sentLabels });
      } else if (mode === "forward" && message?.id) {
        await forwardMessage(message.id, {
          to: toAddresses,
          body: html,
          from: formattedFrom,
          attachments,
          sentLabels,
        });
      } else {
        await sendMessage({
          to: toAddresses,
          subject,
          body: html,
          from: formattedFrom,
          attachments,
          sentLabels,
        });
      }
      setSendState("done");
      setTimeout(() => onClose?.(), 1200);
    } catch (e) {
      setSendState("err");
      setErr(e.message);
    }
  }, [editor, selectedAlias, to, subject, mode, message, onClose, attachments, groups, contacts]);

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

        {isNew && <RecipientPicker to={to} onChange={setTo} />}

        {isNew && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Prefix:</span>
            <input
              className={styles.fieldInput}
              value={subjectPrefix}
              onChange={(e) => setSubjectPrefix(e.target.value)}
              placeholder="e.g. Contract question"
            />
          </div>
        )}

        {mode !== "reply" && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Subject:</span>
            <input
              className={styles.fieldInput}
              value={subject}
              onChange={(e) => {
                setSubjectTouched(true);
                setSubject(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
            />
          </div>
        )}

        <AttachmentPicker
          showFolderId={showFolderId}
          show={show}
          attachments={attachments}
          onChange={setAttachments}
        />
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
