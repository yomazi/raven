/**
 * AttachmentUpload.jsx
 *
 * Per-attachment categorize-and-upload UI, factored out of GmailPanel.jsx so
 * it's a standalone unit: NamingForm (the team/doctype/subtype/stage picker
 * that computes a filename prefix from GmailPanel_config.js) and
 * AttachmentRow (the collapsed row + toggle that shows it).
 */

import { createContractFolder, uploadToDrive } from "@api/drive.api.js";
import { fetchAttachment, fetchDriveFiles } from "@api/gmail.api.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./GmailPanel.module.css";
import { DOCTYPES, TEAMS, buildPrefix, computeNextVersion, getStageOptions } from "./GmailPanel_config.js";

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function extBadge(filename) {
  return (filename?.split(".").pop()?.toUpperCase() ?? "?").slice(0, 4);
}

// Programming, Production, and Finance documents belong in a specific
// contract's Drive subfolder rather than the show's root — this decides
// whether that target-folder picker should show for the current team.
// Marketing bypasses this entirely (fixed "!Marketing Assets" folder), and
// Box Office has no folder-routing rule of its own yet.
function needsContractFolder(team) {
  return team === "prg" || team === "prod" || team === "fin";
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

export function NamingForm({
  att,
  messageId,
  folderId,
  contracts = [],
  marketingFolderId = null,
  onUploaded,
  onCancel,
}) {
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

  // Teams with no doctypes configured at all (Marketing, Box Office) skip
  // every naming step and upload under the original filename.
  const skipNaming = doctypeOptions.length === 0;
  // Marketing has a dedicated fixed target folder; Box Office doesn't, so it
  // falls through to showsContractPicker (false for it) -> the show root.
  const useMarketingFolder = team === "mkt";

  // Shown for Programming, Production, and Finance docs even with zero
  // existing contracts — that's exactly the case where you need
  // "+ New contract…" to create one without leaving the upload flow.
  const showsContractPicker = needsContractFolder(team);
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

  const targetFolderId = useMarketingFolder
    ? marketingFolderId
    : showsContractPicker
      ? contractFolderId || null
      : folderId;
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
    if (skipNaming) {
      // No prefix/version to compute — skip the scan.
      setFolderFiles([]);
      return;
    }
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
  }, [targetFolderId, isCreatingContract, skipNaming]);

  useEffect(() => {
    if (skipNaming) {
      // No filename prefix for this team — upload under the original name.
      setSuggestedName(att.filename);
      setEditedName(att.filename);
      return;
    }
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
  }, [
    team,
    doctypeKey,
    effectiveSubtype,
    effectivePaymentType,
    stage,
    folderFiles,
    att.filename,
    skipNaming,
  ]);

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
      onUploaded({ filename: editedName.trim(), folderId: uploadFolderId });
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
        {!skipNaming && (
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
        )}
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
                : useMarketingFolder
                  ? "!Marketing Assets folder not set up for this show"
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

export function AttachmentRow({
  att,
  messageId,
  folderId,
  contracts,
  marketingFolderId,
  uploadKey,
  uploadedNames,
  onUploaded,
}) {
  const [showForm, setShowForm] = useState(false);
  const isDone = uploadedNames.has(uploadKey);

  const handleUploaded = useCallback(
    (result) => {
      onUploaded(uploadKey, result);
      setShowForm(false);
    },
    [uploadKey, onUploaded]
  );

  const uploaded = uploadedNames.get(uploadKey);

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
          {isDone && (
            <div className={styles.uploadedAs}>
              ✓ {uploaded?.filename}
              {uploaded?.folderId && (
                <>
                  {" · "}
                  <a
                    className={styles.uploadedLink}
                    href={`https://drive.google.com/drive/folders/${uploaded.folderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View folder
                  </a>
                </>
              )}
            </div>
          )}
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
          marketingFolderId={marketingFolderId}
          onUploaded={handleUploaded}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
