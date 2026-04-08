// client/src/hooks/useShowBuild.js

import { usePatchShow } from "@hooks/usePatchShow.js";
import { useToast } from "@hooks/useToast.js";
import { useCallback, useEffect, useRef, useState } from "react";

export function useShowBuild(show) {
  const googleFolderId = show?.googleFolderId;
  const [build, setBuild] = useState(show?.build ?? {});
  const committedRef = useRef(show?.build ?? {}); // last known server state
  const toast = useToast();

  // Sync when show prop changes (e.g. navigating to a different show)
  useEffect(() => {
    if (show?.build) {
      setBuild(show.build);
      committedRef.current = show.build;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.googleFolderId]); // intentionally keyed on id, not deep equality

  const { mutate: patch } = usePatchShow(googleFolderId);

  const setField = useCallback(
    (field, newValue) => {
      const previousValue = committedRef.current[field];
      if (newValue === previousValue) return;

      // Optimistic update
      setBuild((prev) => ({ ...prev, [field]: newValue }));

      patch(
        { [`build.${field}`]: newValue },
        {
          onSuccess: (updatedShow) => {
            // Sync local state with server response (may include auto-populated dates etc.)
            const serverBuild = updatedShow?.build ?? {};
            setBuild(serverBuild);
            committedRef.current = serverBuild;

            toast({
              description: `"${fieldLabel(field)}" updated.`,
              duration: 3000,
              onUndo: () => setField(field, previousValue),
            });
          },
          onError: () => {
            // Roll back optimistic update
            setBuild((prev) => ({ ...prev, [field]: previousValue }));

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

  const addGmailLink = useCallback(
    (url) => {
      if (!url) return;
      const current = committedRef.current.gmailLinks ?? [];
      if (current.includes(url)) return;
      setField("gmailLinks", [...current, url]);
    },
    [setField]
  );

  const removeGmailLink = useCallback(
    (url) => {
      const current = committedRef.current.gmailLinks ?? [];
      setField(
        "gmailLinks",
        current.filter((u) => u !== url)
      );
    },
    [setField]
  );

  return {
    build,
    setField,
    addGmailLink,
    removeGmailLink,
  };
}

// ---------------------------------------------------------------------------
// Human-readable field labels for toast messages
// ---------------------------------------------------------------------------

const FIELD_LABELS = {
  shouldShowInRoster: "Roster",
  notes: "Notes",
  announceOnSaleNotes: "Announce / on sale notes",
  gmailLinks: "Gmail links",
  showFolder: "Show folder",
  calendarUpdated: "Calendar",
  bookingSpreadsheet: "Booking spreadsheet",
  offerInFolder: "Offer letter",
  packetSent: "Packet sent",
  sisPopulated: "SIS populated",
  tessitura: "Tessitura",
  tnew: "TNEW",
  marketingAssetsCompiled: "Marketing assets",
  marketingAssetsLastCheckin: "Assets last checkin",
  sisReleased: "SIS released",
  contract: "Contract",
  contractLastCheckin: "Contract last checkin",
  weDraftedContract: "We drafted contract",
  livestream: "Livestream",
  workbook: "Workbook",
};

function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}
