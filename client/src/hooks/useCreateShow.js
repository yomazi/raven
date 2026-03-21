import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createShowFolder } from "../api/shows.api.js";
import useShowsStore from "../store/useShowsStore.js";

const FADE_DELAY_MS = 5000;

export const useCreateShow = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useShowsStore();

  return useMutation({
    mutationFn: createShowFolder,

    onMutate: () => {
      setSyncPhase("syncing", "Creating show folder in Drive…");
    },

    onSuccess: (data) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      setStatusMessage(`Folder created — ${data.folderName}`, "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to create folder: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
