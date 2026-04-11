// ClientArea.jsx
import Banner from "@components/Content/shared/Banner/Banner.jsx";
import BuildProperties from "@components/Content/shared/BuildProperties/BuildProperties.jsx";
import ShowProperties from "@components/ShowProperties/ShowProperties.jsx";
import { useShowById } from "@hooks/useShowById.js";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import styles from "./EventClientArea.module.css";
import GmailPanel from "./GmailPanel/GmailPanel.jsx";

const EventClientArea = () => {
  const { showFolderId } = useParams();
  const { data: show, isError, error } = useShowById(showFolderId, { retry: false });

  if (!showFolderId) {
    return <Navigate to={`/shows/default/`} replace />;
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
              <Route path="build" element={<BuildProperties show={show} />} />
              <Route path="gmail" element={<GmailPanel showFolderId={showFolderId} />} />
              <Route
                path="gmail/:threadId/:messageId"
                element={<GmailPanel showFolderId={showFolderId} />}
              />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
};

export default EventClientArea;
