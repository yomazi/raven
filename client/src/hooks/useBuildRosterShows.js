// hooks/useRosterShows.js
import { useQuery } from "@tanstack/react-query";
import { fetchShows } from "../api/shows.api";

export const useBuildRosterShows = () => {
  return useQuery({
    queryKey: ["shows"],
    queryFn: fetchShows,
    select: (shows) => shows.filter((s) => s.build?.shouldShowInRoster === true),
  });
};
