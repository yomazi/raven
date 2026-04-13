import { fetchShowById } from "@api/shows.api.js";
import { useQuery } from "@tanstack/react-query";

export const useShowById = (googleFolderId, options = {}) => {
  return useQuery({
    queryKey: ["show", googleFolderId],
    queryFn: () => fetchShowById(googleFolderId),
    enabled: !!googleFolderId && googleFolderId !== "default",
    ...options,
  });
};
