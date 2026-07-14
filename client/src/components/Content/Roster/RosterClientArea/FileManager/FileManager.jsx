import { downloadDriveFile } from "@api/drive.api.js";
import { useToast } from "@hooks/useToast.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import ContextMenu from "./ContextMenu.jsx";
import FileIcon from "./FileIcon.jsx";
import FileListPanel from "./FileListPanel.jsx";
import styles from "./FileManager.module.css";
import { FolderChildren } from "./FolderTree.jsx";
import UploadNamingModal from "./UploadNamingModal.jsx";

const MIN_TREE_WIDTH = 160;
const MAX_TREE_WIDTH = 560;

const FileManager = ({ showFolderId, show }) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedFolderId, setSelectedFolderId] = useState(showFolderId);
  const [selectedPath, setSelectedPath] = useState([showFolderId]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null); // { x, y, node } | null
  const [uploadQueue, setUploadQueue] = useState(null); // { folderId, files, index } | null
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [treeWidth, setTreeWidth] = useState(260);
  const resizeStateRef = useRef(null); // { startX, startWidth } | null

  const handleDividerMouseMove = useCallback((e) => {
    const resize = resizeStateRef.current;
    if (!resize) return;
    const next = resize.startWidth + (e.clientX - resize.startX);
    setTreeWidth(Math.min(MAX_TREE_WIDTH, Math.max(MIN_TREE_WIDTH, next)));
  }, []);

  const handleDividerMouseUp = useCallback(() => {
    resizeStateRef.current = null;
    window.removeEventListener("mousemove", handleDividerMouseMove);
  }, [handleDividerMouseMove]);

  const handleDividerMouseDown = useCallback(
    (e) => {
      resizeStateRef.current = { startX: e.clientX, startWidth: treeWidth };
      window.addEventListener("mousemove", handleDividerMouseMove);
      window.addEventListener("mouseup", handleDividerMouseUp, { once: true });
    },
    [treeWidth, handleDividerMouseMove, handleDividerMouseUp]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleDividerMouseMove);
      window.removeEventListener("mouseup", handleDividerMouseUp);
    };
  }, [handleDividerMouseMove, handleDividerMouseUp]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectFolder = useCallback((id, path) => {
    setSelectedFolderId(id);
    setSelectedPath(path);
    setSelectedFileId(null);
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    setSelectedFileId(node.id);
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleDownload = useCallback(
    async (node) => {
      try {
        await downloadDriveFile(node.id);
      } catch (err) {
        toast({ title: "Download failed", description: err.message });
      }
    },
    [toast]
  );

  const handleDropFiles = useCallback((folderId, fileList) => {
    setUploadQueue({ folderId, files: Array.from(fileList), index: 0 });
  }, []);

  const handleFileUploaded = useCallback(() => {
    setUploadQueue((prev) => {
      if (!prev) return null;
      const nextIndex = prev.index + 1;
      if (nextIndex >= prev.files.length) return null;
      return { ...prev, index: nextIndex };
    });
    queryClient.invalidateQueries({ queryKey: ["drive-files"] });
  }, [queryClient]);

  if (!showFolderId) {
    return <div className={styles.emptyState}>Select a show from the roster.</div>;
  }

  const rootLabel = show?.artist ?? "Show Folder";

  return (
    <div className={styles.root}>
      <div
        className={`${styles.treePane} ${isRootDragOver ? styles.paneDragOver : ""}`}
        style={{ width: treeWidth }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsRootDragOver(true);
        }}
        onDragLeave={() => setIsRootDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsRootDragOver(false);
          if (e.dataTransfer.files?.length) handleDropFiles(showFolderId, e.dataTransfer.files);
        }}
      >
        <div
          className={`${styles.row} ${selectedFolderId === showFolderId ? styles.rowSelected : ""}`}
          onClick={() => handleSelectFolder(showFolderId, [showFolderId])}
        >
          <span className={styles.chevron} />
          <FileIcon isFolder isOpen />
          <span className={styles.name} title={rootLabel}>
            {rootLabel}
          </span>
        </div>

        <FolderChildren
          folderId={showFolderId}
          path={[showFolderId]}
          depth={1}
          expandedIds={expandedIds}
          selectedFolderId={selectedFolderId}
          selectedPath={selectedPath}
          onToggle={toggleExpand}
          onSelect={handleSelectFolder}
          onDropFiles={handleDropFiles}
        />
      </div>

      <div className={styles.divider} onMouseDown={handleDividerMouseDown} />

      <FileListPanel
        folderId={selectedFolderId}
        selectedFileId={selectedFileId}
        onSelectFile={setSelectedFileId}
        onContextMenu={handleContextMenu}
        onDropFiles={handleDropFiles}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[{ label: "Download", onClick: () => handleDownload(contextMenu.node) }]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {uploadQueue && (
        <UploadNamingModal
          key={`${uploadQueue.folderId}-${uploadQueue.index}`}
          file={uploadQueue.files[uploadQueue.index]}
          folderId={uploadQueue.folderId}
          remaining={uploadQueue.files.length - uploadQueue.index}
          onUploaded={handleFileUploaded}
          onCancel={() => setUploadQueue(null)}
        />
      )}
    </div>
  );
};

export default FileManager;
