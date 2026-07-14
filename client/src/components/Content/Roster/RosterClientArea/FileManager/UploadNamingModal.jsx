import { uploadToDrive } from "@api/drive.api.js";
import {
  DOCTYPES,
  TEAMS,
  buildPrefix,
  computeNextVersion,
  getStageOptions,
} from "@components/Content/Roster/RosterClientArea/GmailContainer/GmailPanel/GmailPanel_config.js";
import { useDriveFiles } from "@hooks/useDriveFiles.js";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./UploadNamingModal.module.css";

// Same "only react to a change, never to mount" pattern (and the same
// reasoning) as GmailPanel's NamingForm — see that file for details.
const DEFAULT_TEAM = TEAMS[0].code;
const DEFAULT_DOCTYPE_KEY = (DOCTYPES[DEFAULT_TEAM] ?? [])[0]?.key ?? "";
const DEFAULT_STAGE =
  getStageOptions((DOCTYPES[DEFAULT_TEAM] ?? []).find((d) => d.key === DEFAULT_DOCTYPE_KEY) ?? null)[0]
    ?.value ?? "";

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

export default function UploadNamingModal({ file, folderId, remaining, onUploaded, onCancel }) {
  const [team, setTeam] = useState(DEFAULT_TEAM);
  const [doctypeKey, setDoctypeKey] = useState(DEFAULT_DOCTYPE_KEY);
  const [subtype, setSubtype] = useState("");
  const [customSubtype, setCustomSubtype] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [customPaymentType, setCustomPaymentType] = useState("");
  const [stage, setStage] = useState(DEFAULT_STAGE);
  const [suggestedName, setSuggestedName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  const { data: folderFiles, isLoading: loadingFolder } = useDriveFiles(folderId);
  const existingNames = useMemo(() => (folderFiles ?? []).map((f) => f.name), [folderFiles]);

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
    if (!doctypeKey || loadingFolder) return;
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
      const version = computeNextVersion(existingNames, prefixNoVersion);
      const finalPrefix = buildPrefix({
        team,
        doctype: doctypeKey,
        subtype: effectiveSubtype,
        paymentType: effectivePaymentType,
        stage,
        version,
      });
      name = `${finalPrefix} - ${file.name}`;
    } else {
      name = `${prefixNoVersion} - ${file.name}`;
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
    existingNames,
    loadingFolder,
    file.name,
  ]);

  const handleUpload = async () => {
    if (!editedName.trim()) {
      setErr("Filename cannot be empty.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      await uploadToDrive({
        blob: file,
        filename: editedName.trim(),
        mimeType: file.type || "application/octet-stream",
        folderId,
      });
      onUploaded({ filename: editedName.trim(), folderId });
    } catch (e) {
      setErr(e.message);
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            Upload &ldquo;{file.name}&rdquo;
            {remaining > 1 && (
              <span className={styles.remaining}> ({remaining} files remaining)</span>
            )}
          </Dialog.Title>
          <div className={styles.meta}>
            {file.type || "unknown type"} · {formatBytes(file.size)}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <span className={styles.label}>Team</span>
              <select className={styles.select} value={team} onChange={(e) => setTeam(e.target.value)}>
                {TEAMS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Document type</span>
              {doctypeOptions.length > 0 ? (
                <select
                  className={styles.select}
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
                  className={styles.input}
                  value={doctypeKey}
                  onChange={(e) => setDoctypeKey(e.target.value)}
                  placeholder="doctype"
                />
              )}
            </div>
          </div>

          {hasSubtypes && (
            <div className={styles.row}>
              <div className={styles.field}>
                <span className={styles.label}>Rider type</span>
                <select
                  className={styles.select}
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
                <div className={styles.field}>
                  <span className={styles.label}>Custom type</span>
                  <input
                    className={styles.input}
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
            <div className={styles.row}>
              <div className={styles.field}>
                <span className={styles.label}>Payment type</span>
                <select
                  className={styles.select}
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
                <div className={styles.field}>
                  <span className={styles.label}>Custom type</span>
                  <input
                    className={styles.input}
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
            <div className={styles.row}>
              <div className={styles.field}>
                <span className={styles.label}>Stage</span>
                <select className={styles.select} value={stage} onChange={(e) => setStage(e.target.value)}>
                  {stageOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={styles.previewWrap}>
            <span className={styles.label}>Filename</span>
            {loadingFolder ? (
              <span className={styles.hint}>Scanning folder…</span>
            ) : (
              <input
                className={styles.previewInput}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
          {editedName !== suggestedName && suggestedName && (
            <button className={styles.resetBtn} onClick={() => setEditedName(suggestedName)}>
              Reset to suggested
            </button>
          )}

          {err && <div className={styles.errText}>{err}</div>}

          <div className={styles.actions}>
            <button className={styles.buttonSecondary} onClick={onCancel} disabled={uploading}>
              Cancel
            </button>
            <button
              className={styles.buttonPrimary}
              onClick={handleUpload}
              disabled={uploading || loadingFolder}
            >
              {uploading ? "Uploading…" : "Upload to Drive"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
