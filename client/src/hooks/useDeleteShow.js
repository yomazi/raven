import { deleteShowFolder } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useDeleteShow = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage, clearSelectedShow } =
    useRavenStore();

  return useMutation({
    mutationFn: deleteShowFolder,

    onMutate: () => {
      setSyncPhase("syncing", "Deleting show…");
    },

    onSuccess: (data, variables) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      queryClient.removeQueries({ queryKey: ["show", variables.googleFolderId] });
      clearSelectedShow();
      setStatusMessage("Show deleted", "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to delete show: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
