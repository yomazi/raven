import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncShows } from "../api/shows.api.js";
import useShowsStore from "../store/useShowsStore.js";

const FADE_DELAY_MS = 5000;

export const useSyncShows = () => {
  const queryClient = useQueryClient();
  const { setStatusMessage, clearStatusMessage } = useShowsStore();

  return useMutation({
    mutationFn: () => syncShows(),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shows"] });

      const { scraped, upserted, modified } = data;
      setStatusMessage(
        `Sync complete — ${scraped} scraped, ${upserted} added, ${modified} updated`,
        "success"
      );

      setTimeout(clearStatusMessage, FADE_DELAY_MS);
    },

    onError: (err) => {
      setStatusMessage(`Sync failed: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
    },
  });
};
