import axios from "axios";
import { useEffect, useState } from "react";

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // optional, to track loading state
  const [error, setError] = useState(null); // optional, to track errors

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/auth/google/status", {
          withCredentials: "include", // sends cookie
        });
        setLoggedIn(res.status === 200); // 200 => logged in, 401 => not
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await axios.post("/auth/google/expire", {}, { withCredentials: true });
      setLoggedIn(false);
    } catch (err) {
      console.error(err);
      setError(err);
    }
  };

  return { loggedIn, loading, error, logout };
}
