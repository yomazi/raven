// client/src/components/Content/BadgeSelect/BadgeSelect.jsx
//
// A standalone badge selector for use in property pages and forms.
// Use the `variant` prop to select the CSS variable namespace:
//   variant="status"   → data-status attribute, --status-* variables
//   variant="priority" → data-priority attribute, --priority-* variables
//
// Only one dropdown can be open at a time — opening a new one closes
// the previous via a module-level singleton object.
//
// Props:
//   value       string   — current value
//   options     string[] — ordered list of valid values
//   labels      object   — { [value]: displayLabel }
//   variant     string   — "status" | "priority"
//   onChange    fn       — (newValue) => void
//   readonly    bool     — renders badge without interaction
//   openOnMount bool     — opens dropdown immediately on mount (for AG Grid adapter)

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BadgeSelect.module.css";
import { currentBadge } from "./badgeSelectSingleton.js";

function dataKey(value) {
  return value?.replace(/\s+/g, "_").replace(/-/g, "_") ?? "na";
}

function dataAttr(variant, value) {
  return { [`data-${variant}`]: dataKey(value) };
}

// Module-level singleton — mutated only in effects and event handlers

export default function BadgeSelect({
  value,
  options,
  labels,
  variant = "status",
  onChange,
  readonly,
  openOnMount = false,
}) {
  const [open, setOpen] = useState(openOnMount);
  const [pos, setPos] = useState(null);
  const badgeRef = useRef(null);
  const dropdownRef = useRef(null);
  const closeSelfRef = useRef(null);

  useEffect(() => {
    // Keep closeSelfRef current so cleanup can identify us
    closeSelfRef.current = () => {
      setOpen(false);
      setPos(null);
    };
  });

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      setOpen(false);
      setPos(null);
    }
    window.addEventListener("scroll", onScroll, true); // capture phase catches all scrolls
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  // Register as current on mount if openOnMount; deregister on unmount
  useEffect(() => {
    if (openOnMount) {
      currentBadge.close?.();
      currentBadge.close = closeSelfRef.current;
    }
    return () => {
      if (currentBadge.close === closeSelfRef.current) {
        currentBadge.close = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Position dropdown below badge
  useEffect(() => {
    if (!open || !badgeRef.current || !dropdownRef.current) return;
    const badgeRect = badgeRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - badgeRect.bottom;

    const fitsBelow = spaceBelow >= dropdownRect.height + 4;
    const top = fitsBelow ? badgeRect.bottom + 4 : badgeRect.top - dropdownRect.height - 4;

    setPos({
      top,
      left: badgeRect.left + badgeRect.width / 2 - dropdownRect.width / 2,
    });
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setPos(null);
      }
    }
    document.addEventListener("keydown", onKey, true); // capture phase
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (!e.target.closest(`.${styles.dropdown}`) && !e.target.closest(`.${styles.badge}`)) {
        setOpen(false);
        setPos(null);
      }
    }
    const t = setTimeout(() => window.addEventListener("mousedown", onMouseDown), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  function handleToggle() {
    if (readonly) return;
    if (!open) {
      // Close whatever is currently open, register ourselves
      currentBadge.close?.();
      currentBadge.close = closeSelfRef.current;
    }
    setOpen((prev) => !prev);
    setPos(null);
  }

  function handleSelect(newVal) {
    setOpen(false);
    setPos(null);
    if (newVal !== value) onChange?.(newVal);
  }

  const dropdown = open && (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={
        pos
          ? { position: "fixed", top: pos.top, left: pos.left }
          : { position: "fixed", top: 0, left: 0, visibility: "hidden" }
      }
    >
      {options.map((opt) => (
        <button
          key={opt}
          className={`${styles.option} ${opt === value ? styles.selected : ""}`}
          {...dataAttr(variant, opt)}
          onClick={() => handleSelect(opt)}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div
        ref={badgeRef}
        className={`${styles.badge} ${readonly ? styles.readonly : ""}`}
        {...dataAttr(variant, value)}
        onClick={handleToggle}
        role="button"
        tabIndex={readonly ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleToggle();
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {labels[value] ?? value}
      </div>
      {open && createPortal(dropdown, document.body)}
    </>
  );
}
