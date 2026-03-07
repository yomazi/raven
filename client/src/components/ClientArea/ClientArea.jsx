// ClientArea.jsx
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

// Helper components for demonstration
function ShowProperties({ showId }) {
  return (
    <div>
      <b>Show Properties</b> for show ID: {showId} asfase
    </div>
  );
}

function BuildShow({ showId }) {
  return (
    <div>
      <b>Build Show</b> for show ID: {showId}
    </div>
  );
}

function GenerateEmail({ showId }) {
  return (
    <div>
      <b>Generate Email</b> for show ID: {showId}
    </div>
  );
}

function Livestream({ showId }) {
  return (
    <div>
      <b>Build Livestream</b> for show ID: {showId}
    </div>
  );
}

export default function ClientArea() {
  const { showId } = useParams();
  const navigate = useNavigate();

  if (!showId) {
    return <Navigate to={`/default/`} replace />;
  }

  // Button click handler to navigate to a specific action
  const goToAction = (action) => {
    navigate(`/${showId}/${action}`);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", margin: "1rem" }}>
      {/* Header buttons */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => goToAction("build-show")} style={{ marginRight: 8 }}>
          Build Show
        </button>
        <button onClick={() => goToAction("generate-email")} style={{ marginRight: 8 }}>
          Generate Email
        </button>
        <button onClick={() => goToAction("livestream")}>Livestream</button>
      </div>

      {/* Dynamic client content */}
      <div style={{ flex: 1, padding: 16, border: "1px solid #ccc" }}>
        <Routes>
          {/* Default route */}
          <Route index element={<Navigate to="show-properties" replace />} />
          {/* Routes for different actions */}
          <Route path="show-properties" element={<ShowProperties showId={showId} />} />
          <Route path="build-show" element={<BuildShow showId={showId} />} />
          <Route path="generate-email" element={<GenerateEmail showId={showId} />} />
          <Route path="livestream" element={<Livestream showId={showId} />} />
        </Routes>
      </div>
    </div>
  );
}
