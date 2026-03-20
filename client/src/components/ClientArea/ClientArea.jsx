// ClientArea.jsx
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useShowById } from "../../hooks/useShowById.js";
import Banner from "./Banner/Banner.jsx";
import styles from "./ClientArea.module.css";
import Dragonfly from "./Dragonfly/Dragonfly.jsx";

// Helper components for demonstration
function ShowProperties({ showFolderId }) {
  return (
    <div>
      <b>Show Properties</b> for show ID: {showFolderId}
    </div>
  );
}

function BuildShow({ showFolderId }) {
  return (
    <div>
      <b>Build Show</b> for show ID: {showFolderId}
    </div>
  );
}

function GenerateEmail({ showFolderId }) {
  return (
    <div>
      <b>Generate Email</b> for show ID: {showFolderId}
    </div>
  );
}

function Livestream({ showFolderId }) {
  return (
    <div>
      <b>Build Livestream</b> for show ID: {showFolderId}
    </div>
  );
}

export default function ClientArea() {
  const { showId } = useParams();
  const isDefault = showId === "default";
  const { data: show, isLoading, isError } = useShowById(showId);
  const navigate = useNavigate();

  if (!showId) {
    return <Navigate to={`/default/`} replace />;
  }

  if (isLoading) return <div>Loading show...</div>;
  if (isError) return <div>Error loading show.</div>;

  // Button click handler to navigate to a specific action
  const goToAction = (action) => {
    navigate(`/${showId}/${action}`);
  };

  return (
    <div className={styles.clientArea}>
      {!isDefault && <Banner show={show} />}
      {/* Header buttons */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => goToAction("show-properties")} style={{ marginRight: 8 }}>
          Show Properties
        </button>
        <button onClick={() => goToAction("build-show")} style={{ marginRight: 8 }}>
          Build Show
        </button>
        <button onClick={() => goToAction("generate-email")} style={{ marginRight: 8 }}>
          Generate Email
        </button>
        <button onClick={() => goToAction("livestream")}>Livestream</button>
      </div>

      {/* Dynamic client content */}
      <div>
        <Routes>
          {/* Default route */}
          <Route index element={<Navigate to="show-properties" replace />} />
          {/* Routes for different actions */}
          <Route path="show-properties" element={<ShowProperties showFolderId={showId} />} />
          <Route path="build-show" element={<BuildShow showFolderId={showId} />} />
          <Route path="generate-email" element={<GenerateEmail showFolderId={showId} />} />
          <Route path="livestream" element={<Livestream showFolderId={showId} />} />
          <Route path="dragonfly" element={<Dragonfly showFolderId={showId} />} />
          <Route
            path="dragonfly/:threadId/:messageId"
            element={<Dragonfly showFolderId={showId} />}
          />
        </Routes>
      </div>
    </div>
  );
}
