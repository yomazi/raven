import { useDriveFiles } from "@hooks/useDriveFiles.js";
import { useState } from "react";
import FileIcon from "./FileIcon.jsx";
import styles from "./FileManager.module.css";

function formatBytes(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function FileListPanel({ folderId, selectedFileId, onSelectFile, onContextMenu, onDropFiles }) {
  // Only fetches the contents of whichever folder is currently selected —
  // switching folders swaps the query key rather than pulling everything up front.
  const { data: files, isLoading, error } = useDriveFiles(folderId);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`${styles.filePane} ${isDragOver ? styles.filePaneDragOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.length) onDropFiles(folderId, e.dataTransfer.files);
      }}
    >
      {isLoading && <div className={styles.emptyState}>Loading files…</div>}
      {error && <div className={styles.emptyState}>Couldn't load files: {error.message}</div>}
      {!isLoading && !error && (files?.length ?? 0) === 0 && (
        <div className={styles.emptyState}>No files in this folder — drop files here to upload.</div>
      )}
      {!isLoading && !error && files?.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file) => (
            <div
              key={file.id}
              className={`${styles.fileRow} ${selectedFileId === file.id ? styles.rowSelected : ""}`}
              title={file.name}
              onClick={() => onSelectFile(file.id)}
              onDoubleClick={() => {
                if (file.webViewLink) window.open(file.webViewLink, "_blank", "noopener,noreferrer");
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, file);
              }}
            >
              <FileIcon mimeType={file.mimeType} />
              <span className={styles.name}>{file.name}</span>
              <span className={styles.size}>{formatBytes(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
