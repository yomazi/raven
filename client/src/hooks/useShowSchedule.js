// client/src/hooks/useShowSchedule.js

import { usePatchShow } from "@hooks/usePatchShow.js";
import { useToast } from "@hooks/useToast.js";
import { useCallback, useEffect, useRef, useState } from "react";

export function useShowSchedule(show) {
  const googleFolderId = show?.googleFolderId;
  const [schedule, setSchedule] = useState(show?.schedule ?? {});
  const committedRef = useRef(show?.schedule ?? {});
  const toast = useToast();

  useEffect(() => {
    if (show?.schedule) {
      setSchedule(show.schedule);
      committedRef.current = show.schedule;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.googleFolderId]);

  const { mutate: patch } = usePatchShow(googleFolderId);

  const setField = useCallback(
    (field, newValue) => {
      const previousValue = committedRef.current[field];
      if (newValue === previousValue) return;

      setSchedule((prev) => ({ ...prev, [field]: newValue }));

      patch(
        { [`schedule.${field}`]: newValue },
        {
          onSuccess: (updatedShow) => {
            const serverSchedule = updatedShow?.schedule ?? {};
            setSchedule(serverSchedule);
            committedRef.current = serverSchedule;

            toast({
              description: `"${fieldLabel(field)}" updated.`,
              duration: 3000,
              onUndo: () => setField(field, previousValue),
            });
          },
          onError: () => {
            setSchedule((prev) => ({ ...prev, [field]: previousValue }));

            toast({
              title: "Save failed",
              description: `Could not update ${fieldLabel(field)}. Please try again.`,
              duration: 5000,
            });
          },
        }
      );
    },
    [googleFolderId, patch, toast]
  );

  // Presales helpers — operate on the full array, same pattern as gmailLinks

  const addPresale = useCallback(() => {
    const current = committedRef.current.presales ?? [];
    const newPresale = { name: "Donor Presale", startDateTime: null, endDateTime: null };
    setField("presales", [...current, newPresale]);
  }, [setField]);

  const updatePresale = useCallback(
    (index, updates) => {
      const current = committedRef.current.presales ?? [];
      const updated = current.map((p, i) => (i === index ? { ...p, ...updates } : p));
      setField("presales", updated);
    },
    [setField]
  );

  const removePresale = useCallback(
    (index) => {
      const current = committedRef.current.presales ?? [];
      setField(
        "presales",
        current.filter((_, i) => i !== index)
      );
    },
    [setField]
  );

  return {
    schedule,
    setField,
    addPresale,
    updatePresale,
    removePresale,
  };
}

const FIELD_LABELS = {
  notes: "Announce / on sale notes",
  releaseAsap: "Release ASAP",
  announceDateTime: "Announce date/time",
  onSaleDateTime: "On sale date/time",
  presales: "Presales",
};

function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}
