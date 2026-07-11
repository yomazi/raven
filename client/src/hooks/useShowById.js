import { fetchShowById } from "@api/shows.api.js";
import { useQuery } from "@tanstack/react-query";

export const useShowById = (googleFolderId, options = {}) => {
  return useQuery({
    queryKey: ["show", googleFolderId],
    queryFn: () => fetchShowById(googleFolderId),
    enabled: !!googleFolderId && googleFolderId !== "default",
    // The show doc is what the Drive folder-target pickers (contract
    // subfolders, Marketing Assets) are built from — a stale cached show
    // can list an archived contract's folder or hide a newly created one,
    // so every call site here is a single-show detail view where "never
    // stale" matters more than an instant cached paint.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    ...options,
  });
};
