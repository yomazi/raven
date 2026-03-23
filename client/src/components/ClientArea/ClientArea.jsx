// ClientArea.jsx
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useShowById } from "../../hooks/useShowById.js";
import ShowProperties from "../ShowProperties/ShowProperties.jsx";
import Banner from "./Banner/Banner.jsx";
import styles from "./ClientArea.module.css";
import Dragonfly from "./Dragonfly/Dragonfly.jsx";

export default function ClientArea() {
  const { showFolderId } = useParams();
  const { data: show, isError, error } = useShowById(showFolderId, { retry: false });

  if (!showFolderId) {
    return <Navigate to={`/default/`} replace />;
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
              <Route path="properties" element={<ShowProperties showFolderId={showFolderId} />} />
              <Route path="dragonfly" element={<Dragonfly showFolderId={showFolderId} />} />
              <Route
                path="dragonfly/:threadId/:messageId"
                element={<Dragonfly showFolderId={showFolderId} />}
              />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}
