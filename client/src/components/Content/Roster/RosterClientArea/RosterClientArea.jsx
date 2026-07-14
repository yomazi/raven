import Banner from "@components/Content/shared/Banner/Banner.jsx";
import BuildProperties from "@components/Content/shared/BuildProperties/BuildProperties.jsx";
import ContractsPanel from "@components/Content/shared/ContractsPanel/ContractsPanel.jsx";
import ShowProperties from "@components/ShowProperties/ShowProperties.jsx";
import Parser from "@components/Workflows/Parser.jsx";
import { useShowById } from "@hooks/useShowById.js";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import FileManager from "./FileManager/FileManager.jsx";
import GmailContainer from "./GmailContainer/GmailContainer.jsx";
import styles from "./RosterClientArea.module.css";

const RosterClientArea = () => {
  const { showFolderId } = useParams();
  const { data: show, isError, error } = useShowById(showFolderId, { retry: false });

  if (!showFolderId) {
    return <div className={styles.empty}>Select a show from the roster.</div>;
  }

  return (
    <div className={styles.clientArea}>
      {isError ? (
        <div className={styles.errorMessage}>
          Couldn't load that show: {error?.message ?? "unknown error."}
        </div>
      ) : (
        <>
          {show && <Banner show={show} />}
          <div className={styles.routeContainer}>
            <Routes>
              {/* Default route */}
              <Route index element={<Navigate to="properties" replace />} />
              {/* Routes for different actions */}
              <Route
                path="properties"
                element={<ShowProperties key={showFolderId} showFolderId={showFolderId} />}
              />
              <Route path="contracts" element={<ContractsPanel show={show} />} />
              <Route path="build" element={<BuildProperties show={show} />} />
              <Route
                path="gmail"
                element={<GmailContainer showFolderId={showFolderId} show={show} />}
              />
              <Route
                path="gmail/:threadId/:messageId"
                element={<GmailContainer showFolderId={showFolderId} show={show} />}
              />
              <Route path="files" element={<FileManager showFolderId={showFolderId} show={show} />} />
              <Route path="test" element={<Parser showFolderId={showFolderId} show={show} />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
};

export default RosterClientArea;
