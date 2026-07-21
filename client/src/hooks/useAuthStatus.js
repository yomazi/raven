import axios from "axios";
import { useEffect, useState } from "react";

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(false);
  // Distinct from loggedIn: that reflects the app-wide Google grant (one
  // record, shared across every browser); this reflects whether *this*
  // browser's own apiToken cookie currently works — the two can disagree
  // (e.g. a new device/browser, or cookies cleared) even though loggedIn is
  // effectively always true once the app's been set up once.
  const [hasLocalSession, setHasLocalSession] = useState(true); // optimistic until checked
  const [loading, setLoading] = useState(true); // optional, to track loading state
  const [error, setError] = useState(null); // optional, to track errors

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          "/api/v1/auth/status",
          {},
          {
            withCredentials: "include", // sends cookie
          }
        );
        setLoggedIn(res.status === 200); // 200 => logged in, 401 => not
      } catch (err) {
        console.error(err);
        setError(err);
      }

      try {
        await axios.get("/api/v1/auth/session", { withCredentials: true });
        setHasLocalSession(true);
      } catch {
        setHasLocalSession(false);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await axios.post("/api/v1/auth/expire", {}, { withCredentials: true });
      setLoggedIn(false);
    } catch (err) {
      console.error(err);
      setError(err);
    }
  };

  return { loggedIn, hasLocalSession, loading, error, logout };
}
