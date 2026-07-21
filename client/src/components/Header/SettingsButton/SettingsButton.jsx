import { useSettings, useUpdateSetting } from "@hooks/useSettings.js";
import useRavenStore from "@store/useRavenStore.js";
import SvgSettings from "@svg/settings_google.svg?react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SettingsButton.module.css";

// ---------------------------------------------------------------------------
// SettingRow — a single key/value setting, editable inline, committed on blur
// ---------------------------------------------------------------------------

function SettingRow({ setting, onUpdate }) {
  const [testDraft, setTestDraft] = useState(setting.value?.test ?? "");
  const [prodDraft, setProdDraft] = useState(setting.value?.prod ?? "");

  function commit(environment, draft, original) {
    const trimmed = draft.trim();
    if (trimmed !== (original ?? "")) {
      onUpdate({ key: setting.key, environment, value: trimmed });
    }
  }

  return (
    <div className={styles.settingRow}>
      <span className={styles.settingLabel}>{setting.label}</span>
      <div className={styles.settingValues}>
        <div className={styles.settingValueField}>
          <span className={styles.settingEnvLabel}>Test</span>
          <input
            id={`setting-${setting.key}-test`}
            type="text"
            className={styles.settingInput}
            value={testDraft}
            onChange={(e) => setTestDraft(e.target.value)}
            onBlur={() => commit("test", testDraft, setting.value?.test)}
          />
        </div>
        <div className={styles.settingValueField}>
          <span className={styles.settingEnvLabel}>Prod</span>
          <input
            id={`setting-${setting.key}-prod`}
            type="text"
            className={styles.settingInput}
            value={prodDraft}
            onChange={(e) => setProdDraft(e.target.value)}
            onBlur={() => commit("prod", prodDraft, setting.value?.prod)}
          />
        </div>
      </div>
    </div>
  );
}

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const { data, isLoading, refetch } = useSettings();
  // Defends against a stale persisted query cache (localStorage) holding the
  // pre-test/prod-split shape, where this query cached a bare array instead
  // of { settings, environment } — self-heals instead of showing nothing
  // until the cache naturally expires or gets busted.
  const settings = Array.isArray(data) ? data : (data?.settings ?? []);
  const environment = Array.isArray(data) ? null : data?.environment;

  // staleTime: 0 (see useSettings) means a fresh mount refetches, but this
  // component stays mounted the whole session — without this, reopening the
  // panel would keep showing whatever was fetched at page load, missing any
  // settings added/changed since (e.g. by a migration) until a hard reload.
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);
  const { mutate: updateSetting } = useUpdateSetting();

  // Position panel below the button, right-aligned to it
  useEffect(() => {
    if (!open || !buttonRef.current || !panelRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    setPos({
      top: buttonRect.bottom + 8,
      left: buttonRect.right - panelRect.width,
    });
  }, [open]);

  // RosterGrid installs its own Escape handler on `window` with
  // { capture: true } and calls stopPropagation(), which stops the event
  // before it ever reaches `document` — so ours has to live on the same
  // node/phase to still be called (stopPropagation doesn't block other
  // listeners on the same target, only propagation to other targets).
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey, { capture: true });
    // Tell RosterGrid to skip its own Escape-clears-filter shortcut while
    // this panel is open, so closing it doesn't also clear the grid filter.
    useRavenStore.getState().setSuppressGridEscapeClear(true);
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      useRavenStore.getState().setSuppressGridEscapeClear(false);
    };
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
      <div className={styles.panelHeader}>
        Settings
        {environment && <span className={styles.envBadge}>Active: {environment}</span>}
      </div>
      {isLoading && <p className={styles.empty}>Loading…</p>}
      {!isLoading && settings.length === 0 && <p className={styles.empty}>No settings yet.</p>}
      {settings.map((setting) => (
        <SettingRow key={setting.key} setting={setting} onUpdate={updateSetting} />
      ))}
    </div>
  );

  return (
    <>
      <button ref={buttonRef} className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <SvgSettings />
        Settings
      </button>
      {open && createPortal(panel, document.body)}
    </>
  );
}
