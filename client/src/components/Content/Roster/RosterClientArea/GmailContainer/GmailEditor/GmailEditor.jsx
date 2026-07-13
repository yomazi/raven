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

function folderBlockHtml(folderId) {
  return folderId
    ? `<p>Here's the folder:<br/><a href="https://drive.google.com/drive/folders/${folderId}">https://drive.google.com/drive/folders/${folderId}</a></p>`
    : "";
}

// Body templates for new messages, picked via the "Template:" field. Each
// `body(folderId)` produces the initial editor content; "default" embeds a
// live folder link (see withUpdatedFolderLink for how it stays in sync with
// the Folder field afterward).
const TEMPLATES = [
  {
    id: "default",
    label: "Default",
    body: (folderId) => `<p>Hey folks,</p><p></p><p></p><p></p>${folderBlockHtml(folderId)}`,
  },
  {
    id: "contract-signature",
    label: "Contract needs signature",
    body: () => `<p>For you to sign.</p>`,
  },
];

function deriveInitialHtml(mode, message, showFolderId) {
  const folderBlock = folderBlockHtml(showFolderId);

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

  return TEMPLATES[0].body(showFolderId);
}

// Surgically repoints the "Here's the folder" link at whatever folder is
// currently selected, without touching the rest of the body — so changing
// the Folder field mid-composition doesn't wipe anything the user's typed.
// A no-op if the user has deleted that link, or hasn't reached this point.
const FOLDER_BLOCK_REGEX = /(Here's the folder:<br>)<a[^>]*href="[^"]*"[^>]*>[^<]*<\/a>/;

function withUpdatedFolderLink(html, folderId) {
  if (!folderId || !FOLDER_BLOCK_REGEX.test(html)) return html;
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  return html.replace(FOLDER_BLOCK_REGEX, `$1<a href="${url}">${url}</a>`);
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
    // RosterGrid installs its own Escape handler on `window` with
    // { capture: true } and calls stopPropagation(), which stops the event
    // before it ever reaches `document` — so ours has to live on the same
    // node/phase to still be called (stopPropagation doesn't block other
    // listeners on the same target, only propagation to other targets).
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    // Tell RosterGrid to skip its own Escape-clears-filter shortcut while
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

// Target options for the "Folder" field: "— None —" (which resolves to the
// show's root folder, so there's always an active folder), its Marketing
// Assets subfolder (if created), and each active contract — mirrors the
// folder layout shows actually have on Drive. Also drives the compose
// subject line (see GmailEditor's subject-sync effect) and which folder's
// files the Attach picker below lists.
//
// Also resolves `defaultId` — the contract whose name matches the show's
// artist, if any, so that folder is pre-selected; otherwise the show's root
// folder (i.e. "— None —") is the default.
function useAttachTargetOptions(showFolderId, show) {
  return useMemo(() => {
    const options = [{ id: showFolderId, label: "— None —", contract: null }];

    const marketingAssetsId = show?.drive?.folderIds?.marketingAssets;
    if (marketingAssetsId) {
      options.push({ id: marketingAssetsId, label: "Marketing Assets", contract: null });
    }

    const artist = (show?.artist ?? "").trim().toLowerCase();
    let matchedContractId = null;

    for (const contract of show?.build?.contracts ?? []) {
      if (contract.archived) continue;
      options.push({ id: contract.folderId, label: contract.signee, contract });
      if (!matchedContractId && (contract.signee ?? "").trim().toLowerCase() === artist) {
        matchedContractId = contract.folderId;
      }
    }

    return { options, defaultId: matchedContractId ?? showFolderId };
  }, [showFolderId, show]);
}

function AttachmentPicker({ selectedFolderId, attachments, onChange }) {
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
        <select
          className={styles.fieldSelect}
          value=""
          onChange={handleSelect}
          disabled={!selectedFolderId}
        >
          <option value="" disabled>
            {selectedFolderId ? "Attach a PDF…" : "Select a Folder above to attach files"}
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
  const [selectedFolderId, setSelectedFolderId] = useState(""); // Folder field — always ends up set (see default-select effect below)
  const [contractTouched, setContractTouched] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [templateTouched, setTemplateTouched] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ driveFileId, filename, mimeType }]
  const [sendState, setSendState] = useState("idle"); // "idle" | "busy" | "done" | "err"
  const [err, setErr] = useState(null);

  const { options: attachOptions, defaultId: defaultContractFolderId } = useAttachTargetOptions(
    showFolderId,
    show
  );
  const selectedContract = attachOptions.find((o) => o.id === selectedFolderId)?.contract ?? null;

  // Default the Folder field to whichever active contract's name matches the
  // show's artist, or the show's root folder ("— None —") otherwise, until
  // the user picks something themselves. Keyed off `defaultContractFolderId`
  // (not `showFolderId`) so it self-corrects once `show` catches up after
  // switching shows, since `show` can lag a render behind `showFolderId`.
  useEffect(() => {
    if (contractTouched) return;
    setSelectedFolderId(defaultContractFolderId);
  }, [contractTouched, defaultContractFolderId]);

  // For a brand-new message, keep the subject in sync with "<prefix>: <show>"
  // (or "<prefix>: <contract> | <show>" when the selected Folder resolves to
  // a contract whose name differs from the artist) until the user types
  // directly into the Subject field. The prefix field itself
  // stays exactly what was typed — the colon is only ever added here, to the
  // derived subject, never written back into subjectPrefix.
  useEffect(() => {
    if (!isNew || subjectTouched) return;
    const bannerText = formatBannerText(show);
    const prefixOutput = withTrailingColon(subjectPrefix);
    const sameAsArtist =
      selectedContract &&
      (selectedContract.signee ?? "").trim().toLowerCase() ===
        (show?.artist ?? "").trim().toLowerCase();
    const subjectBody =
      selectedContract && !sameAsArtist
        ? [selectedContract.signee, bannerText].filter(Boolean).join(" | ")
        : bannerText;
    setSubject([prefixOutput, subjectBody].filter(Boolean).join(" "));
  }, [isNew, subjectTouched, subjectPrefix, show, selectedContract]);

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

  // Repoint the "Here's the folder" link at the currently selected Folder
  // (contract subfolder, Marketing Assets, or the show root) whenever it
  // changes — without wiping the rest of the body (see withUpdatedFolderLink).
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const updatedHtml = withUpdatedFolderLink(currentHtml, selectedFolderId);
    if (updatedHtml !== currentHtml) {
      editor.commands.setContent(updatedHtml, { emitUpdate: false });
    }
  }, [editor, selectedFolderId]);

  // Apply the selected Template's body when the user explicitly picks one —
  // gated by templateTouched so it doesn't overwrite the initial content on
  // mount (which already matches the default template). Uses whatever
  // Folder is currently selected at the moment of the switch; if the user
  // changes the Folder afterward, the effect above keeps the link in sync
  // without re-applying (and thus wiping) the template again.
  useEffect(() => {
    if (!editor || !templateTouched) return;
    const template = TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0];
    editor.commands.setContent(template.body(selectedFolderId));
    editor.commands.focus("start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, templateTouched, selectedTemplateId]);

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
    setContractTouched(false);
    setSelectedTemplateId(TEMPLATES[0].id);
    setTemplateTouched(false);
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

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Folder:</span>
          <select
            className={styles.fieldSelect}
            value={selectedFolderId}
            onChange={(e) => {
              setContractTouched(true);
              setSelectedFolderId(e.target.value);
            }}
            disabled={!showFolderId}
          >
            {attachOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

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

        {isNew && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Template:</span>
            <select
              className={styles.fieldSelect}
              value={selectedTemplateId}
              onChange={(e) => {
                setTemplateTouched(true);
                setSelectedTemplateId(e.target.value);
              }}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <AttachmentPicker
          selectedFolderId={selectedFolderId}
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
