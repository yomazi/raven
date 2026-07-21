import { loginWithToken } from "@api/auth.api.js";
import { useToast } from "@hooks/useToast.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TokenLogin.module.css";

export default function TokenLogin() {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setErr("Enter a token.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await loginWithToken(token.trim());
      toast({ description: "Signed in.", duration: 3000 });
      navigate("/roster");
    } catch (e) {
      setErr(e.response?.data?.message ?? e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Sign in with a token</h1>
        <p className={styles.hint}>
          Paste a named API token (from Settings → API Tokens) to sign in as that token, instead
          of going through Google.
        </p>
        <input
          className={styles.input}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your token…"
          spellCheck={false}
          autoFocus
        />
        {err && <div className={styles.errText}>{err}</div>}
        <button className={styles.submitBtn} type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
