// client/src/components/Workflows/Parser.jsx

import { fetchFileText, fetchFolderFiles } from "@api/drive.api.js";
import { useContentExtraction } from "@hooks/useContentExtraction.js";
import { useEffect, useState } from "react";
import GoogleDocIcon from "@svg/google-docs_rg.svg?react";
import PdfIcon from "@svg/pdf_rg.svg?react";
import styles from "./Parser.module.css";

const PDF_MIME = "application/pdf";
const GDOC_MIME = "application/vnd.google-apps.document";
const SUPPORTED_TYPES = [PDF_MIME, GDOC_MIME];

const FILE_ICONS = {
  [PDF_MIME]: <PdfIcon className={styles.fileIcon} />,
  [GDOC_MIME]: <GoogleDocIcon className={styles.fileIcon} />,
};

// Folder options: the show's root folder, its Marketing Assets subfolder (if
// created), and each active contract's subfolder — same layout used by the
// Email attachment picker, so offer letters and signed contracts filed into
// a contract's own subfolder are visible here too.
function useParserFolderOptions(showFolderId, show) {
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

const Parser = ({ showFolderId, show }) => {
  const folderOptions = useParserFolderOptions(showFolderId, show);
  const [selectedFolderId, setSelectedFolderId] = useState(showFolderId);

  useEffect(() => {
    setSelectedFolderId(showFolderId);
  }, [showFolderId]);

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

  useEffect(() => {
    if (!selectedFolderId) return;
    const load = async () => {
      setIsFetchingFiles(true);
      setFilesError(null);
      setSelectedFile(null);
      try {
        const all = await fetchFolderFiles(selectedFolderId);
        setFiles(all.filter((f) => SUPPORTED_TYPES.includes(f.mimeType)));
      } catch (err) {
        setFilesError(err.message ?? "Failed to load folder contents.");
      } finally {
        setIsFetchingFiles(false);
      }
    };
    load();
  }, [selectedFolderId]);

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
    <div className={styles.parser}>
      <h2 className={styles.heading}>Parse Offers & Contracts</h2>

      <div className={styles.columns}>
        {/* Left column — file picker */}
        <div className={styles.leftCol}>
          <span className={styles.label}>Files</span>
          {folderOptions.length > 1 && (
            <select
              className={styles.folderSelect}
              value={selectedFolderId ?? ""}
              onChange={(e) => setSelectedFolderId(e.target.value)}
            >
              {folderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
          <div className={styles.colScroll}>
            {isFetchingFiles && <p className={styles.muted}>Loading…</p>}
            {filesError && <p className={styles.error}>{filesError}</p>}
            {!isFetchingFiles && files.length === 0 && !filesError && (
              <p className={styles.muted}>No supported files found.</p>
            )}
            {files.length > 0 && (
              <ul className={styles.fileList}>
                {files.map((file) => (
                  <li
                    key={file.id}
                    className={`${styles.fileItem} ${selectedFile?.id === file.id ? styles.selected : ""}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    {FILE_ICONS[file.mimeType]}
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedFile && (
            <button className={styles.button} onClick={handleFetchText} disabled={isFetchingText}>
              {isFetchingText ? "Fetching…" : "Fetch Text"}
            </button>
          )}
          {fetchTextError && <p className={styles.error}>{fetchTextError}</p>}
        </div>

        {/* Right column — fetched text */}
        {fetchedText && (
          <div className={styles.rightCol}>
            <span className={styles.label}>Text</span>
            <div className={styles.colScroll}>
              <pre className={styles.pre}>{fetchedText}</pre>
            </div>
            <button className={styles.button} onClick={handleExtract} disabled={isExtracting}>
              {isExtracting ? "Extracting…" : "Extract"}
            </button>
            {isExtractionError && (
              <p className={styles.error}>
                Extraction failed: {extractionError?.message ?? "unknown error"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Full-width — parsed JSON */}
      {isExtracted && extracted && (
        <div className={styles.results}>
          <span className={styles.label}>Extracted Data</span>
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
        </div>
      )}
    </div>
  );
};

export default Parser;
