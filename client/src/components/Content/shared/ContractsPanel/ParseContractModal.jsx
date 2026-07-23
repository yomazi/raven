// client/src/components/Content/shared/ContractsPanel/ParseContractModal.jsx
//
// Per-contract parsing workflow: pick a PDF version of this contract, fetch
// its text, trim it down, send it to the LLM, then review the structured
// fields it extracts on a second "step" that swipes in. Every tile there
// writes back onto this contract, merged at its own path so applying one
// tile never clobbers another.

import { fetchFileText } from "@api/drive.api.js";
import { extractOfferLetter } from "@api/llm.api.js";
import * as Dialog from "@radix-ui/react-dialog";
import SvgClose from "@svg/close_google.svg?react";
import { useMutation } from "@tanstack/react-query";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { sortContractPdfsByRecency } from "../../../../utilities/contractPdf.js";
import { getAtPath, setAtPath } from "./contractTermsFields.js";
import ContractTermsTiles from "./ContractTermsTiles.jsx";
import styles from "./ParseContractModal.module.css";

// Everything stateful lives here rather than in ParseContractModal itself,
// and this component only ever exists while the dialog is open (see the
// `key`-based remount below). That means every piece of state — step, the
// fetched text, extracted fields, the pane-height measurement — starts at
// its true initial value on every open, with no "reset" effect needed and
// nothing stale left over from a previous session to race against.
function ParseWizard({ contract, files, onApplySection }) {
  const pdfFiles = useMemo(() => sortContractPdfsByRecency(files), [files]);

  const [step, setStep] = useState("parse"); // "parse" | "terms"
  const [selectedFileId, setSelectedFileId] = useState(pdfFiles[0]?.id ?? null);
  const [text, setText] = useState("");
  const [isFetchingText, setIsFetchingText] = useState(false);
  const [fetchTextError, setFetchTextError] = useState(null);
  const [fields, setFields] = useState(null);
  const [appliedPaths, setAppliedPaths] = useState(new Set());

  const parsePaneRef = useRef(null);
  const termsPaneRef = useRef(null);
  const [paneHeight, setPaneHeight] = useState(undefined);

  // Keep the modal's height tracking whichever pane is currently active, so
  // the swipe between steps animates both position and height together
  // instead of jumping or leaving dead space around the shorter pane.
  useLayoutEffect(() => {
    const activeEl = step === "parse" ? parsePaneRef.current : termsPaneRef.current;
    if (!activeEl) return undefined;
    setPaneHeight(activeEl.offsetHeight);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setPaneHeight(entry.contentRect.height);
    });
    observer.observe(activeEl);
    return () => observer.disconnect();
  }, [step]);

  const {
    mutate: runExtract,
    isPending: isExtracting,
    isError: isExtractionError,
    error: extractionError,
    reset,
  } = useMutation({
    mutationFn: (documentText) => extractOfferLetter(documentText),
    onSuccess: (data) => {
      setFields(data?.extracted ?? null);
      setAppliedPaths(new Set());
      setStep("terms");
    },
  });

  const { mutate: applySection, isPending: isApplying } = useMutation({
    mutationFn: ({ path, values }) => onApplySection(contract._id, path, values),
    onSuccess: (_, { path }) => {
      setAppliedPaths((prev) => new Set(prev).add(path.join(".")));
    },
  });

  const selectedFile = pdfFiles.find((f) => f.id === selectedFileId) ?? null;

  async function handleFetchText() {
    if (!selectedFile) return;
    setIsFetchingText(true);
    setFetchTextError(null);
    setFields(null);
    reset();
    try {
      const fetchedText = await fetchFileText(selectedFile.id, selectedFile.mimeType);
      setText(fetchedText);
    } catch (err) {
      setFetchTextError(err.message ?? "Failed to fetch file text.");
    } finally {
      setIsFetchingText(false);
    }
  }

  function handleExtract() {
    if (!text.trim()) return;
    runExtract(text);
  }

  function handleApplySection(section) {
    const parsedValues = getAtPath(fields, section.path);
    const values = {};
    section.fields.forEach((f) => {
      values[f.key] = parsedValues?.[f.key] ?? null;
    });
    applySection({ path: section.path, values });
  }

  function handleFieldChange(path, key, value) {
    setFields((prev) => setAtPath(prev ?? {}, path, key, value));
    setAppliedPaths((prev) => {
      const next = new Set(prev);
      next.delete(path.join("."));
      return next;
    });
  }

  return (
    <>
      <Dialog.Close asChild>
        <button className={styles.closeButton} aria-label="Close">
          <SvgClose className={styles.closeIcon} />
        </button>
      </Dialog.Close>

      <Dialog.Title className={styles.title}>
        Parse Contract{contract?.signee ? `: ${contract.signee}` : ""}
      </Dialog.Title>

      <div className={styles.wizardViewport} style={{ height: paneHeight }}>
        <div className={styles.wizardTrack} data-step={step}>
          <div className={styles.wizardPane} ref={parsePaneRef}>
            <div className={styles.fileRow}>
              <span className={styles.label}>Version</span>
              {pdfFiles.length === 0 ? (
                <span className={styles.muted}>No PDF versions found in this contract's folder.</span>
              ) : (
                <select
                  className={styles.select}
                  value={selectedFileId ?? ""}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                >
                  {pdfFiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                className={styles.button}
                onClick={handleFetchText}
                disabled={!selectedFile || isFetchingText}
              >
                {isFetchingText ? "Fetching…" : "Fetch Text"}
              </button>
            </div>
            {fetchTextError && <p className={styles.error}>{fetchTextError}</p>}

            <div className={styles.textCol}>
              <span className={styles.label}>Text sent to the LLM (edit to trim excess)</span>
              <textarea
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Fetch a version above, then trim anything that shouldn't be sent to the LLM."
              />
              <div className={styles.extractRow}>
                <button
                  className={styles.button}
                  onClick={handleExtract}
                  disabled={!text.trim() || isExtracting}
                >
                  {isExtracting ? "Extracting…" : "Extract"}
                </button>
                {selectedFile && (
                  <a
                    className={styles.docLink}
                    href={`https://drive.google.com/file/d/${selectedFile.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Contract Doc
                  </a>
                )}
                {fields && (
                  <button className={styles.linkButton} onClick={() => setStep("terms")}>
                    View Contract Terms →
                  </button>
                )}
              </div>
              {isExtractionError && (
                <p className={styles.error}>
                  Extraction failed: {extractionError?.message ?? "unknown error"}
                </p>
              )}
            </div>
          </div>

          <div className={styles.wizardPane} ref={termsPaneRef}>
            <div className={styles.results}>
              <button className={styles.linkButton} onClick={() => setStep("parse")}>
                ← Back to Parse
              </button>
              <span className={styles.label}>Extracted Data</span>
              {fields ? (
                <ContractTermsTiles
                  data={fields}
                  current={contract}
                  onFieldChange={handleFieldChange}
                  onApplySection={handleApplySection}
                  appliedPaths={appliedPaths}
                  isSaving={isApplying}
                />
              ) : (
                <p className={styles.muted}>Extract data first to review contract terms.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   contract      full contract subdocument ({ _id, signee, folderId, terms, production, payment, ... })
 *   files         drive file objects already fetched for the contract's folder
 *   onApplySection  (contractId, path, values) => Promise — writes one
 *                   section's reviewed fields onto the contract at `path`
 */
export default function ParseContractModal({
  open,
  onOpenChange,
  contract,
  files,
  onApplySection,
}) {
  // Bumped each time the dialog transitions closed → open, so <ParseWizard>
  // gets a fresh `key` and therefore a genuine remount — see its comment
  // for why that's what actually fixes the stale-state-on-reopen bug.
  // (Comparing against state rather than mutating a ref during render is
  // the pattern React's docs recommend for this "adjust state when a prop
  // changes" case — it survives a render being thrown away and retried,
  // which a plain ref mutation wouldn't.)
  const [sessionKey, setSessionKey] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSessionKey((k) => k + 1);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          {open && (
            <ParseWizard key={sessionKey} contract={contract} files={files} onApplySection={onApplySection} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
