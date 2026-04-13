// ClientArea.jsx
import Banner from "@components/Content/shared/Banner/Banner.jsx";
import BuildProperties from "@components/Content/shared/BuildProperties/BuildProperties.jsx";
import ShowProperties from "@components/ShowProperties/ShowProperties.jsx";
import TestBed from "@components/TestBed/TestBed.jsx";
import { useShowById } from "@hooks/useShowById.js";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import styles from "./EventClientArea.module.css";
import GmailContainer from "./GmailContainer/GmailContainer.jsx";

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
              <Route path="gmail" element={<GmailContainer showFolderId={showFolderId} />} />
              <Route
                path="gmail/:threadId/:messageId"
                element={<GmailContainer showFolderId={showFolderId} />}
              />
              <Route path="test" element={<TestBed showFolderId={showFolderId} />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
};

export default EventClientArea;
