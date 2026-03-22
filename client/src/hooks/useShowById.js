import { useQuery } from "@tanstack/react-query";
import { fetchShowById } from "../api/shows.api.js";

export const useShowById = (googleFolderId, options = {}) => {
  return useQuery({
    queryKey: ["show", googleFolderId],
    queryFn: () => fetchShowById(googleFolderId),
    enabled: !!googleFolderId && googleFolderId !== "default",
    ...options,
  });
};
