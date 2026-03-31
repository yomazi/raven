import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BadgeSelectEditor.module.css";

const BadgeSelectEditor = forwardRef(function BadgeSelectEditor(props, ref) {
  const { value, options, labels, badgeClass, onSelect, api, node, column } = props;
  const [current, setCurrent] = useState(value);
  const [pos, setPos] = useState(null);
  const badgeRef = useRef(null);
  const dropdownRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getValue: () => current,
    // no isPopup — let AG Grid handle it as an inline editor
  }));

  // Two-pass measurement: badge renders first, then dropdown renders hidden,
  // then this effect fires and positions it correctly
  useEffect(() => {
    if (!badgeRef.current || !dropdownRef.current) return;
    const badgeRect = badgeRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    setPos({
      top: badgeRect.bottom + 4,
      left: badgeRect.left + badgeRect.width / 2 - dropdownRect.width / 2,
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") api.stopEditing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (!e.target.closest(`.${styles.dropdown}`)) {
        api.stopEditing(true);
      }
    }
    const t = setTimeout(() => window.addEventListener("mousedown", onMouseDown), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [api]);

  // Close on grid scroll
  useEffect(() => {
    function onScroll() {
      api.stopEditing(true);
    }
    // The AG Grid viewport element
    const viewport = document.querySelector(".ag-body-viewport");
    viewport?.addEventListener("scroll", onScroll);
    return () => viewport?.removeEventListener("scroll", onScroll);
  }, [api]);

  async function handleSelect(newVal) {
    if (newVal === value) {
      api.stopEditing(true);
      return;
    }
    const oldVal = value;
    setCurrent(newVal);
    node.setDataValue(column.getColId(), newVal);
    api.stopEditing(false);
    try {
      await onSelect(newVal);
    } catch (err) {
      node.setDataValue(column.getColId(), oldVal);
      console.error("Failed to update task:", err);
    }
  }

  // Always render the dropdown — hidden until measured, then snaps into position
  const dropdown = (
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
          className={`${styles.option} ${badgeClass(opt)} ${opt === current ? styles.selected : ""}`}
          onClick={() => handleSelect(opt)}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div ref={badgeRef} className={`${styles.taskBadge} ${badgeClass(current)}`}>
        {labels[current]}
      </div>
      {createPortal(dropdown, document.body)}
    </>
  );
});

export default BadgeSelectEditor;
