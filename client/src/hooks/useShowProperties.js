import { useCallback, useEffect, useRef, useState } from "react";
import { usePatchShow } from "./usePatchShow.js";

export const useShowProperties = (show) => {
  const [form, setForm] = useState(show ?? {});
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);

  const { mutate: patch, isPending } = usePatchShow(show?.googleFolderId, (updatedShow) => {
    setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({
        ...prev,
        validation: updatedShow.validation,
      }));
      setIsDirty(false);
    }, 0);
  });

  // EFFECT 1: Initialize form once when show first loads
  useEffect(() => {
    if (show && !initializedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(show);
      initializedRef.current = true;
    }
  }, [show]);

  const setField = useCallback((path, value) => {
    setForm((prev) => setNestedValue(prev, path, value));
    setIsDirty(true);
  }, []);

  const save = useCallback(() => {
    patch(form);
    // isDirty clears in the patch success callback, not here,
    // so a failed save does not falsely clear the dirty state.
  }, [form, patch]);

  // EFFECT 2: Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  return { form, setField, save, isPending, isDirty };
};

function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const result = { ...obj };
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...current[keys[i]] };
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
}
