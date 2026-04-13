import { fetchShows } from "@api/shows.api";
import { useQuery } from "@tanstack/react-query";

export const useShows = () => {
  return useQuery({
    queryKey: ["shows"],
    queryFn: fetchShows,
    onError: (err) => console.error("useShows error:", err),
  });
};
