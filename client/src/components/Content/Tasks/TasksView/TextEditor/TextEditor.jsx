import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./TextEditor.module.css";

const TextEditor = forwardRef(function TextEditor(props, ref) {
  const { value, onSave, api, node, column } = props;
  const [text, setText] = useState(value ?? "");
  const textareaRef = useRef(null);
  const originalValue = useRef(value ?? "");

  const handleBlur = useCallback(async () => {
    const trimmed = text.trim();
    const original = originalValue.current.trim();

    if (trimmed === original) {
      api.stopEditing(true);
      return;
    }

    const oldVal = originalValue.current;
    node.setDataValue(column.getColId(), trimmed);

    try {
      await onSave(trimmed);
    } catch (err) {
      node.setDataValue(column.getColId(), oldVal);
      console.error("Failed to update:", err);
    }

    api.stopEditing(false);
  }, [text, api, node, column, onSave]);

  const handleBlurRef = useRef(null);
  useEffect(() => {
    handleBlurRef.current = handleBlur;
  }, [handleBlur]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;

    function onBlur() {
      handleBlurRef.current?.(); // delegates to current version of handleBlur
    }

    ta.addEventListener("blur", onBlur);
    return () => ta.removeEventListener("blur", onBlur);
  }, []); // still runs once — but onBlur always calls the latest handleBlur via ref

  useImperativeHandle(ref, () => ({
    getValue: () => text,
  }));

  // Focus and select all on mount, and wire up blur manually
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
    // Auto-size on mount
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;

    // AG Grid swallows onBlur — attach directly to the DOM node
    ta.addEventListener("blur", handleBlur);
    return () => ta.removeEventListener("blur", handleBlur);
  }, []);

  // Close on Escape — revert
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setText(originalValue.current);
        api.stopEditing(true); // true = cancel
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  function handleChange(e) {
    setText(e.target.value);
    // Auto-grow
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  return (
    <textarea
      ref={textareaRef}
      className={styles.textarea}
      value={text}
      onChange={handleChange}
      rows={1}
    />
  );
});

export default TextEditor;
