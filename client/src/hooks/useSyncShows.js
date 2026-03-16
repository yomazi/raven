import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncShows } from "../api/shows.api.js";

export const useSyncShows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncShows,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shows"] });
    },
  });
};
