import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMarketingAssetsFolder } from "../api/shows.api.js";
import useShowsStore from "../store/useShowsStore.js";

const FADE_DELAY_MS = 5000;

export const useCreateMarketingAssetsFolder = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useShowsStore();

  return useMutation({
    mutationFn: createMarketingAssetsFolder,

    onMutate: () => {
      setSyncPhase("syncing", "Creating marketing assets folder…");
    },

    onSuccess: (data) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      setStatusMessage(`Marketing assets folder created — ${data.docName}`, "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to create marketing assets folder: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
