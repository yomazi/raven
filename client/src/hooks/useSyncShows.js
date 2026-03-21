import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncShows } from "../api/shows.api.js";
import useShowsStore from "../store/useShowsStore.js";

const FADE_DELAY_MS = 5000;

export const useSyncShows = () => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useShowsStore();

  const mutation = useMutation({
    mutationFn: () => syncShows(),

    onMutate: () => {
      setSyncPhase("syncing", "Syncing from Drive…");
    },

    onSuccess: async (data) => {
      setSyncPhase("loading", "Loading from database…");

      await queryClient.invalidateQueries({ queryKey: ["shows"] });

      clearSyncPhase();

      const { scraped, upserted, modified, deleted } = data;
      const deletedText = deleted > 0 ? `, ${deleted} removed` : "";
      setStatusMessage(
        `${scraped} shows synced — ${upserted} added, ${modified} updated${deletedText}`,
        "success"
      );

      setTimeout(clearStatusMessage, FADE_DELAY_MS);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Sync failed: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
    },
  });

  return mutation;
};
