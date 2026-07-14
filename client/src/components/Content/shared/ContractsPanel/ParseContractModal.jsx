// client/src/components/Content/shared/ContractsPanel/ParseContractModal.jsx
//
// Per-contract version of the Parse Offers & Contracts workflow (see
// Workflows/Parser.jsx): pick a PDF version of this contract, fetch its
// text, trim it down, send it to the LLM, and review the structured fields
// it extracts. Nothing is written back to the show yet — this is review only.

import { fetchFileText } from "@api/drive.api.js";
import { extractOfferLetter } from "@api/llm.api.js";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { sortContractPdfsByRecency } from "../../../../utilities/contractPdf.js";
import styles from "./ParseContractModal.module.css";

const FIELD_SECTIONS = [
  {
    title: "Main Terms",
    path: ["terms", "main"],
    fields: [
      { key: "guarantee", label: "Guarantee" },
      { key: "backendType", label: "Backend Type" },
      { key: "percentage", label: "Percentage" },
      { key: "splitPoint", label: "Split Point" },
    ],
  },
  {
    title: "GA Tickets",
    path: ["ticketPrices", "ga"],
    fields: [
      { key: "advance", label: "Advance" },
      { key: "dos", label: "Day of Show" },
    ],
  },
  {
    title: "Premium Tickets",
    path: ["ticketPrices", "premium"],
    fields: [
      { key: "advance", label: "Advance" },
      { key: "dos", label: "Day of Show" },
    ],
  },
  {
    title: "VIP Tickets",
    path: ["ticketPrices", "vip"],
    fields: [
      { key: "advance", label: "Advance" },
      { key: "dos", label: "Day of Show" },
    ],
  },
  {
    title: "Hospitality",
    path: ["production", "hospitality"],
    fields: [
      { key: "hospitalityType", label: "Type" },
      { key: "totalBuyout", label: "Total Buyout" },
    ],
  },
  {
    title: "Meals",
    path: ["production", "meals"],
    fields: [
      { key: "numPeople", label: "# People" },
      { key: "numDays", label: "# Days" },
      { key: "dollarsPerPerson", label: "$ / Person" },
      { key: "totalBuyout", label: "Total Buyout" },
    ],
  },
  {
    title: "Accommodations",
    path: ["production", "accommodations"],
    fields: [
      { key: "numRooms", label: "# Rooms" },
      { key: "numNights", label: "# Nights" },
      { key: "totalBuyout", label: "Total Buyout" },
    ],
  },
  {
    title: "Travel",
    path: ["production", "travel"],
    fields: [{ key: "totalBuyout", label: "Total Buyout" }],
  },
  {
    title: "Backline",
    path: ["production", "backline"],
    fields: [
      { key: "backlineType", label: "Type" },
      { key: "totalBuyout", label: "Total Buyout" },
    ],
  },
  {
    title: "Other",
    path: ["production"],
    fields: [
      { key: "merchCut", label: "Merch Cut" },
      { key: "numGuestListComps", label: "Guest List Comps" },
    ],
  },
  {
    title: "Deposit Payment",
    path: ["payment", "deposit"],
    fields: [
      { key: "dueDate", label: "Due Date" },
      { key: "amount", label: "Amount" },
      { key: "payee", label: "Payee" },
      { key: "method", label: "Method" },
    ],
  },
  {
    title: "Balance Payment",
    path: ["payment", "balance"],
    fields: [
      { key: "payee", label: "Payee" },
      { key: "method", label: "Method" },
    ],
  },
];

function getAtPath(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj) ?? {};
}

function setAtPath(obj, path, key, value) {
  const next = structuredClone(obj);
  const target = path.reduce((acc, p) => {
    if (acc[p] === undefined || acc[p] === null) acc[p] = {};
    return acc[p];
  }, next);
  target[key] = value;
  return next;
}

/**
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   contract      { _id, signee, folderId }
 *   files         drive file objects already fetched for the contract's folder
 */
export default function ParseContractModal({ open, onOpenChange, contract, files }) {
  const pdfFiles = useMemo(() => sortContractPdfsByRecency(files), [files]);

  const [selectedFileId, setSelectedFileId] = useState(null);
  const [text, setText] = useState("");
  const [isFetchingText, setIsFetchingText] = useState(false);
  const [fetchTextError, setFetchTextError] = useState(null);
  const [fields, setFields] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelectedFileId(pdfFiles[0]?.id ?? null);
    setText("");
    setFetchTextError(null);
    setFields(null);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?._id]);

  const {
    mutate: runExtract,
    isPending: isExtracting,
    isError: isExtractionError,
    error: extractionError,
    reset,
  } = useMutation({
    mutationFn: (documentText) => extractOfferLetter(documentText),
    onSuccess: (data) => setFields(data?.extracted ?? null),
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

  function handleFieldChange(path, key, value) {
    setFields((prev) => setAtPath(prev ?? {}, path, key, value));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>
            Parse Contract{contract?.signee ? ` — ${contract.signee}` : ""}
          </Dialog.Title>

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
            </div>
            {isExtractionError && (
              <p className={styles.error}>Extraction failed: {extractionError?.message ?? "unknown error"}</p>
            )}
          </div>

          {fields && (
            <div className={styles.results}>
              <span className={styles.label}>Extracted Data</span>
              <div className={styles.resultsGrid}>
                {FIELD_SECTIONS.map((section) => {
                  const values = getAtPath(fields, section.path);
                  return (
                    <div key={section.title} className={styles.resultSection}>
                      <span className={styles.resultTitle}>{section.title}</span>
                      {section.fields.map((f) => (
                        <label key={f.key} className={styles.resultField}>
                          <span className={styles.resultLabel}>{f.label}</span>
                          <input
                            className={styles.input}
                            type="text"
                            value={values?.[f.key] ?? ""}
                            onChange={(e) => handleFieldChange(section.path, f.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <Dialog.Close asChild>
              <button className={styles.btnCancel}>Close</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
