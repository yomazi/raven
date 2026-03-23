import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout/AppLayout";
import Overlay from "./components/Overlay/Overlay.jsx";

import "./App.css";

function App() {
  return (
    <div id="app">
      <Overlay />
      <BrowserRouter>
        <Routes>
          {/* Redirect root "/" to default show */}
          <Route path="/" element={<Navigate to={`/default/`} replace />} />

          {/* All show-specific routes */}
          <Route path=":showFolderId/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
