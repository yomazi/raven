import { useApiTokens, useCreateApiToken, useRevokeApiToken } from "@hooks/useApiTokens.js";
import { useToast } from "@hooks/useToast.js";
import SvgContentCopy from "@svg/content-copy_google.svg?react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ApiTokensButton.module.css";

function TokenRow({ token, onRevoke }) {
  return (
    <div className={styles.tokenRow}>
      <div className={styles.tokenInfo}>
        <span className={styles.tokenName}>{token.name}</span>
        <span className={styles.tokenDate}>
          {new Date(token.createdAt).toLocaleDateString()}
        </span>
      </div>
      {token.revoked ? (
        <span className={styles.revokedBadge}>Revoked</span>
      ) : (
        <button className={styles.revokeBtn} onClick={() => onRevoke(token.id)}>
          Revoke
        </button>
      )}
    </div>
  );
}

function NewTokenReveal({ name, token, onDismiss }) {
  const toast = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(token);
    toast({ description: "Token copied to clipboard.", duration: 3000 });
  }

  return (
    <div className={styles.reveal}>
      <p className={styles.revealWarning}>
        "{name}" created — copy it now, you won't be able to see it again.
      </p>
      <div className={styles.revealTokenRow}>
        <code className={styles.revealToken}>{token}</code>
        <button className={styles.copyBtn} onClick={handleCopy} aria-label="Copy token">
          <SvgContentCopy />
        </button>
      </div>
      <button className={styles.dismissBtn} onClick={onDismiss}>
        Done
      </button>
    </div>
  );
}

export default function ApiTokensButton() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newToken, setNewToken] = useState(null); // { name, token } — shown once
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const { data: tokens = [], isLoading } = useApiTokens();
  const { mutate: create, isPending: isCreating } = useCreateApiToken();
  const { mutate: revoke } = useRevokeApiToken();

  useEffect(() => {
    if (!open || !buttonRef.current || !panelRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    setPos({
      top: buttonRect.bottom + 8,
      left: buttonRect.right - panelRect.width,
    });
  }, [open, newToken, tokens.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (!e.target.closest(`.${styles.panel}`) && !e.target.closest(`.${styles.trigger}`)) {
        setOpen(false);
      }
    }
    const t = setTimeout(() => window.addEventListener("mousedown", onMouseDown), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  function handleCreate() {
    const name = nameInput.trim();
    if (!name || isCreating) return;
    create(
      { name },
      {
        onSuccess: (result) => {
          setNewToken({ name: result.name, token: result.token });
          setNameInput("");
        },
      }
    );
  }

  const panel = open && (
    <div
      ref={panelRef}
      className={styles.panel}
      style={
        pos
          ? { position: "fixed", top: pos.top, left: pos.left }
          : { position: "fixed", top: 0, left: 0, visibility: "hidden" }
      }
    >
      <div className={styles.panelHeader}>API Tokens</div>

      {newToken ? (
        <NewTokenReveal
          name={newToken.name}
          token={newToken.token}
          onDismiss={() => setNewToken(null)}
        />
      ) : (
        <>
          {isLoading && <p className={styles.empty}>Loading…</p>}
          {!isLoading && tokens.length === 0 && (
            <p className={styles.empty}>No API tokens yet.</p>
          )}
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} onRevoke={revoke} />
          ))}

          <div className={styles.createRow}>
            <input
              type="text"
              className={styles.nameInput}
              placeholder="Token name (e.g. dragonfly)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button className={styles.createBtn} onClick={handleCreate} disabled={isCreating}>
              Create
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        className={styles.trigger}
        onClick={() => {
          setNewToken(null);
          setOpen((prev) => !prev);
        }}
      >
        API Tokens
      </button>
      {open && createPortal(panel, document.body)}
    </>
  );
}
