import { useCallback, useEffect, useRef, useState } from "react";
import { usePatchShow } from "./usePatchShow.js";

export const useShowProperties = (show) => {
  const [form, setForm] = useState(show ?? {});
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);

  const { mutate: patch, isPending } = usePatchShow(show?.googleFolderId, (updatedShow) => {
    setTimeout(() => {
      // Replace the whole draft with the server's response, not just
      // `validation` — the server can compute/default other fields too
      // (e.g. schedule dates when switching release mode to "on-schedule"),
      // and those need to show up in the form after a successful save.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(updatedShow);
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
    // build.contract / build.contracts are mutated live by their own
    // dedicated endpoints (see useShowContracts) as soon as they change,
    // not staged in this draft — sending the stale copy captured when the
    // form loaded would clobber any contract added/edited/archived since.
    const { contract: _contract, contracts: _contracts, ...restBuild } = form.build ?? {};
    patch({ ...form, build: restBuild });
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
