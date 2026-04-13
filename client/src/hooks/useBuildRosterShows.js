// hooks/useRosterShows.js
import { fetchShows } from "@api/shows.api";
import { useQuery } from "@tanstack/react-query";

export const useBuildRosterShows = () => {
  return useQuery({
    queryKey: ["shows"],
    queryFn: fetchShows,
    select: (shows) => shows.filter((s) => s.build?.shouldShowInRoster === true),
  });
};
