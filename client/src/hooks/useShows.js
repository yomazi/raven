import { useQuery } from "@tanstack/react-query";
import { fetchShows } from "../api/shows.api";

export const useShows = () => {
  return useQuery({
    queryKey: ["shows"],
    queryFn: fetchShows,
    onError: (err) => console.error("useShows error:", err),
  });
};
