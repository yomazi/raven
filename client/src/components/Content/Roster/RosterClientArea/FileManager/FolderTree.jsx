import { useSubfolders } from "@hooks/useSubfolders.js";
import { useState } from "react";
import FileIcon from "./FileIcon.jsx";
import styles from "./FileManager.module.css";

// Renders the subfolders of a single folder — only fetched (and only
// mounted) once its parent row is expanded, so collapsed branches never
// hit the network. `path` is the ancestor chain (root-first) down to and
// including `folderId`, threaded through so each child can build its own
// full path for the "open folder" icon logic below.
export function FolderChildren({
  folderId,
  path,
  depth,
  expandedIds,
  selectedFolderId,
  selectedPath,
  onToggle,
  onSelect,
  onDropFiles,
}) {
  const { data: subfolders } = useSubfolders(folderId);

  // No loading indicator here — the file pane already shows one, and this
  // fires on every expand, so a flash of "Loading…" per folder is just noise.
  if (!subfolders || subfolders.length === 0) return null;

  return subfolders.map((f) => (
    <FolderTreeNode
      key={f.id}
      id={f.id}
      name={f.name}
      parentPath={path}
      depth={depth}
      expandedIds={expandedIds}
      selectedFolderId={selectedFolderId}
      selectedPath={selectedPath}
      onToggle={onToggle}
      onSelect={onSelect}
      onDropFiles={onDropFiles}
    />
  ));
}

export default function FolderTreeNode({
  id,
  name,
  parentPath,
  depth,
  expandedIds,
  selectedFolderId,
  selectedPath,
  onToggle,
  onSelect,
  onDropFiles,
}) {
  const isExpanded = expandedIds.has(id);
  const isSelected = selectedFolderId === id;
  // "Open" icon reflects whether we're looking at this folder's contents
  // (or a subfolder of it) — independent of whether its row happens to be
  // expanded in the tree.
  const isOpen = selectedPath.includes(id);
  const path = [...parentPath, id];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) onDropFiles(id, e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${isDragOver ? styles.rowDragOver : ""}`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
        onClick={() => {
          onToggle(id);
          onSelect(id, path);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={styles.chevron}>{isExpanded ? "▾" : "▸"}</span>
        <FileIcon isFolder isOpen={isOpen} />
        <span className={styles.name} title={name}>
          {name}
        </span>
      </div>

      {isExpanded && (
        <FolderChildren
          folderId={id}
          path={path}
          depth={depth + 1}
          expandedIds={expandedIds}
          selectedFolderId={selectedFolderId}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
          onDropFiles={onDropFiles}
        />
      )}
    </div>
  );
}
