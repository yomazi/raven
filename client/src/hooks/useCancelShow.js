import { setShowCanceled } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useCancelShow = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useRavenStore();
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);

  return useMutation({
    mutationFn: setShowCanceled,

    onMutate: ({ canceled }) => {
      setSyncPhase("syncing", canceled ? "Canceling show…" : "Un-canceling show…");
    },

    onSuccess: (data, variables) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      if (data.show) {
        queryClient.setQueryData(["show", variables.googleFolderId], data.show);
        if (selectedShow?.googleFolderId === variables.googleFolderId) {
          setSelectedShow(data.show);
        }
      }
      setStatusMessage(variables.canceled ? "Show canceled" : "Show un-canceled", "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err, variables) => {
      clearSyncPhase();
      setStatusMessage(
        `Failed to ${variables.canceled ? "cancel" : "un-cancel"} show: ${err.message}`,
        "error"
      );
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
