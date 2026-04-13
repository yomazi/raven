// client/src/components/TestBed/TestBed.jsx

import { fetchFileText, fetchFolderFiles } from "@api/drive.api.js";
import { useContentExtraction } from "@hooks/useContentExtraction.js";
import { useEffect, useState } from "react";
import styles from "./TestBed.module.css";

const PDF_MIME = "application/pdf";
const GDOC_MIME = "application/vnd.google-apps.document";
const SUPPORTED_TYPES = [PDF_MIME, GDOC_MIME];

const FILE_ICONS = {
  [PDF_MIME]: "📄",
  [GDOC_MIME]: "📝",
};

const TestBed = ({ showFolderId }) => {
  const [files, setFiles] = useState([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [filesError, setFilesError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fetchedText, setFetchedText] = useState(null);
  const [isFetchingText, setIsFetchingText] = useState(false);
  const [fetchTextError, setFetchTextError] = useState(null);

  const {
    extract,
    apply,
    extracted,
    isExtracting,
    isExtracted,
    isExtractionError,
    extractionError,
    isApplying,
    isApplied,
    isApplyError,
    applyError,
    reset,
  } = useContentExtraction(showFolderId);

  // Load folder contents on mount
  useEffect(() => {
    const load = async () => {
      setIsFetchingFiles(true);
      setFilesError(null);
      try {
        const all = await fetchFolderFiles(showFolderId);
        setFiles(all.filter((f) => SUPPORTED_TYPES.includes(f.mimeType)));
      } catch (err) {
        setFilesError(err.message ?? "Failed to load folder contents.");
      } finally {
        setIsFetchingFiles(false);
      }
    };
    load();
  }, [showFolderId]);

  // Reset extraction state when selected file changes
  useEffect(() => {
    setFetchedText(null);
    setFetchTextError(null);
    reset();
  }, [selectedFile, reset]);

  const handleFetchText = async () => {
    if (!selectedFile) return;
    setIsFetchingText(true);
    setFetchTextError(null);
    setFetchedText(null);
    reset();
    try {
      const text = await fetchFileText(selectedFile.id, selectedFile.mimeType);
      setFetchedText(text);
    } catch (err) {
      setFetchTextError(err.message ?? "Failed to fetch file text.");
    } finally {
      setIsFetchingText(false);
    }
  };

  const handleExtract = () => {
    if (!fetchedText) return;
    extract({ text: fetchedText });
  };

  const handleApply = () => {
    if (!extracted) return;
    apply(extracted);
  };

  return (
    <div className={styles.testBed}>
      <h2 className={styles.heading}>Contract Extraction — Test Bed</h2>

      {/* Step 1: Pick a file */}
      <section className={styles.section}>
        <label className={styles.label}>Step 1 — Select a file</label>
        {isFetchingFiles && <p className={styles.muted}>Loading folder contents…</p>}
        {filesError && <p className={styles.error}>{filesError}</p>}
        {!isFetchingFiles && files.length === 0 && !filesError && (
          <p className={styles.muted}>No supported files found (PDF or Google Doc).</p>
        )}
        {files.length > 0 && (
          <ul className={styles.fileList}>
            {files.map((file) => (
              <li
                key={file.id}
                className={`${styles.fileItem} ${selectedFile?.id === file.id ? styles.selected : ""}`}
                onClick={() => setSelectedFile(file)}
              >
                <span className={styles.fileIcon}>{FILE_ICONS[file.mimeType]}</span>
                {file.name}
              </li>
            ))}
          </ul>
        )}
        {selectedFile && (
          <button className={styles.button} onClick={handleFetchText} disabled={isFetchingText}>
            {isFetchingText ? "Fetching…" : "Fetch Text"}
          </button>
        )}
        {fetchTextError && <p className={styles.error}>{fetchTextError}</p>}
      </section>

      {/* Step 2: Review fetched text */}
      {fetchedText && (
        <section className={styles.section}>
          <label className={styles.label}>Step 2 — Review fetched text</label>
          <pre className={styles.pre}>{fetchedText}</pre>
          <button className={styles.button} onClick={handleExtract} disabled={isExtracting}>
            {isExtracting ? "Extracting…" : "Extract"}
          </button>
          {isExtractionError && (
            <p className={styles.error}>
              Extraction failed: {extractionError?.message ?? "unknown error"}
            </p>
          )}
        </section>
      )}

      {/* Step 3: Review and apply */}
      {isExtracted && extracted && (
        <section className={styles.section}>
          <label className={styles.label}>Step 3 — Review and apply</label>
          <pre className={styles.pre}>{JSON.stringify(extracted, null, 2)}</pre>
          <button
            className={styles.button}
            onClick={handleApply}
            disabled={isApplying || isApplied}
          >
            {isApplying ? "Applying…" : isApplied ? "Applied ✓" : "Apply to Show"}
          </button>
          {isApplied && (
            <p className={styles.success}>Show updated. Check the Properties panel to confirm.</p>
          )}
          {isApplyError && (
            <p className={styles.error}>Apply failed: {applyError?.message ?? "unknown error"}</p>
          )}
        </section>
      )}
    </div>
  );
};

export default TestBed;
