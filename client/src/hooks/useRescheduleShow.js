import { rescheduleShowFolder } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useRescheduleShow = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useRavenStore();
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);

  return useMutation({
    mutationFn: rescheduleShowFolder,

    onMutate: () => {
      setSyncPhase("syncing", "Rescheduling show…");
    },

    onSuccess: (data, variables) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      if (data.show) {
        queryClient.setQueryData(["show", variables.googleFolderId], data.show);
        // selectedShow is a Zustand snapshot, not reactively tied to the
        // query cache — refresh it directly so Nav/other open panes don't
        // show the stale date/artist/multi values.
        if (selectedShow?.googleFolderId === variables.googleFolderId) {
          setSelectedShow(data.show);
        }
      }
      setStatusMessage(`Show rescheduled — ${data.folderName}`, "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to reschedule show: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
