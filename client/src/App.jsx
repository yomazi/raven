import { ToastProvider } from "@providers/ToastProvider/ToastProvider.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout/AppLayout";
import Overlay from "./components/Overlay/Overlay.jsx";

import "./App.css";

function App() {
  return (
    <div id="app">
      <ToastProvider>
        <Overlay />
        <BrowserRouter>
          <Routes>
            {/* Redirect root "/" to the roster */}
            <Route path="/" element={<Navigate to="/roster" replace />} />

            <Route path="/roster/:showFolderId/*" element={<AppLayout mode="roster" />} />
            <Route path="/roster" element={<AppLayout mode="roster" />} />
            <Route path="/token-login" element={<AppLayout mode="tokenLogin" />} />
            <Route path="/tasks/*" element={<AppLayout mode="tasks" />} />
            <Route path="/schedules" element={<AppLayout mode="schedules" />} />
            <Route path="/booking-sync" element={<AppLayout mode="bookingSync" />} />
            <Route path="/contacts" element={<AppLayout mode="contacts" />} />

            {/* Catch-all for any unrecognized route */}
            <Route path="*" element={<AppLayout mode="notfound" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </div>
  );
}

export default App;
