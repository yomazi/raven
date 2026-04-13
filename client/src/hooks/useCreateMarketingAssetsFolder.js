import { createMarketingAssetsFolder } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useCreateMarketingAssetsFolder = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useRavenStore();

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
