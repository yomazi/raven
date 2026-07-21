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

  // Low-level committer shared by every setter below — takes a partial
  // schedule object (plain field names, not dot-notation), applies it
  // optimistically, and persists it as a single patch/toast/undo, however
  // many fields it touches. Keeping this in one place is what lets a
  // cascading change (e.g. release mode + two dates, or a presale date +
  // its linked announce/on-sale date) land as one network round-trip
  // instead of one per field.
  const applyScheduleUpdate = useCallback(
    (partial, label) => {
      const previousSchedule = committedRef.current;
      const optimisticSchedule = { ...previousSchedule, ...partial };
      const updates = {};
      for (const [key, value] of Object.entries(partial)) {
        updates[`schedule.${key}`] = value;
      }

      setSchedule(optimisticSchedule);

      patch(updates, {
        onSuccess: (updatedShow) => {
          const serverSchedule = updatedShow?.schedule ?? {};
          setSchedule(serverSchedule);
          committedRef.current = serverSchedule;

          const previousPartial = {};
          for (const key of Object.keys(partial)) previousPartial[key] = previousSchedule[key];

          toast({
            description: `"${label}" updated.`,
            duration: 3000,
            onUndo: () => applyScheduleUpdate(previousPartial, label),
          });
        },
        onError: () => {
          setSchedule(previousSchedule);

          toast({
            title: "Save failed",
            description: `Could not update ${label}. Please try again.`,
            duration: 5000,
          });
        },
      });
    },
    [patch, toast]
  );

  const setField = useCallback(
    (field, newValue) => {
      const current = committedRef.current;
      if (newValue === current[field]) return;

      const partial = { [field]: newValue };

      // While "On Schedule" is selected, the first presale is locked to the
      // announce/on-sale dates — editing either date propagates to it.
      if (current.releaseMode === "on-schedule" && (current.presales?.length ?? 0) > 0) {
        const presaleField =
          field === "announceDateTime"
            ? "startDateTime"
            : field === "onSaleDateTime"
              ? "endDateTime"
              : null;

        if (presaleField) {
          partial.presales = current.presales.map((p, i) =>
            i === 0 ? { ...p, [presaleField]: newValue } : p
          );
        }
      }

      applyScheduleUpdate(partial, fieldLabel(field));
    },
    [applyScheduleUpdate]
  );

  // Switching to "On Schedule" defaults empty announce/on-sale dates to
  // today at 1pm, without touching dates that are already set.
  const setReleaseMode = useCallback(
    (mode) => {
      const current = committedRef.current;
      if (mode === current.releaseMode) return;

      const partial = { releaseMode: mode };

      if (mode === "on-schedule") {
        const defaultTime = new Date();
        defaultTime.setHours(13, 0, 0, 0);

        if (!current.announceDateTime) partial.announceDateTime = defaultTime;
        if (!current.onSaleDateTime) partial.onSaleDateTime = defaultTime;
      }

      applyScheduleUpdate(partial, fieldLabel("releaseMode"));
    },
    [applyScheduleUpdate]
  );

  // Presales helpers — operate on the full array

  const addPresale = useCallback(() => {
    const current = committedRef.current;
    const presales = current.presales ?? [];

    // The first presale added while "On Schedule" is selected is locked to
    // the announce/on-sale dates; later presales start blank.
    const lockToSchedule = presales.length === 0 && current.releaseMode === "on-schedule";
    const newPresale = {
      name: "Donor Presale",
      startDateTime: lockToSchedule ? (current.announceDateTime ?? null) : null,
      endDateTime: lockToSchedule ? (current.onSaleDateTime ?? null) : null,
    };

    applyScheduleUpdate({ presales: [...presales, newPresale] }, fieldLabel("presales"));
  }, [applyScheduleUpdate]);

  const updatePresale = useCallback(
    (index, updates) => {
      const current = committedRef.current;
      const presales = current.presales ?? [];
      const updatedPresales = presales.map((p, i) => (i === index ? { ...p, ...updates } : p));

      const partial = { presales: updatedPresales };

      // Editing the first presale's dates while "On Schedule" is selected
      // propagates back to the announce/on-sale dates.
      if (index === 0 && current.releaseMode === "on-schedule") {
        if ("startDateTime" in updates) partial.announceDateTime = updates.startDateTime;
        if ("endDateTime" in updates) partial.onSaleDateTime = updates.endDateTime;
      }

      applyScheduleUpdate(partial, fieldLabel("presales"));
    },
    [applyScheduleUpdate]
  );

  const removePresale = useCallback(
    (index) => {
      const current = committedRef.current.presales ?? [];
      applyScheduleUpdate(
        { presales: current.filter((_, i) => i !== index) },
        fieldLabel("presales")
      );
    },
    [applyScheduleUpdate]
  );

  return {
    schedule,
    setField,
    setReleaseMode,
    addPresale,
    updatePresale,
    removePresale,
  };
}

const FIELD_LABELS = {
  notes: "Announce / on sale notes",
  releaseMode: "Release schedule",
  announceDateTime: "Announce date/time",
  onSaleDateTime: "On sale date/time",
  presales: "Presales",
};

function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}
