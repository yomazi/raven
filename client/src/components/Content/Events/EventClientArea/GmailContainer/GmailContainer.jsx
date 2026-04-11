// GmailContainer.jsx

import { useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./GmailContainer.module.css";
import GmailEditor from "./GmailEditor/GmailEditor.jsx";
import GmailPanel from "./GmailPanel/GmailPanel.jsx";

const GmailContainer = ({ showFolderId }) => {
  const { threadId, messageId } = useParams();
  const [editorState, setEditorState] = useState(null); // null | { mode, message }

  const [editorVisible, setEditorVisible] = useState(false);

  const handleCompose = ({ mode, message }) => {
    setEditorState({ mode, message });
    requestAnimationFrame(() => setEditorVisible(true));
  };

  const handleClose = () => {
    setEditorVisible(false);
    setTimeout(() => setEditorState(null), 280); // match transition duration
  };
  if (threadId && messageId) {
    return (
      <div className={styles.container}>
        <GmailPanel
          showFolderId={showFolderId}
          threadId={threadId}
          messageId={messageId}
          onCompose={handleCompose}
        />
        {editorState && (
          <div className={`${styles.overlay} ${editorVisible ? styles.overlayVisible : ""}`}>
            <GmailEditor
              showFolderId={showFolderId}
              mode={editorState.mode}
              message={editorState.message}
              onClose={handleClose}
            />
          </div>
        )}
      </div>
    );
  }

  return <GmailEditor showFolderId={showFolderId} mode="new" message={null} onClose={null} />;
};

export default GmailContainer;
