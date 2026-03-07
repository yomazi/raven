import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout/AppLayout";

import "./App.css";

function App() {
  return (
    <div id="app">
      <BrowserRouter>
        <Routes>
          {/* Redirect root "/" to default show */}
          <Route path="/" element={<Navigate to={`/default/`} replace />} />

          {/* All show-specific routes */}
          <Route path=":showId/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
