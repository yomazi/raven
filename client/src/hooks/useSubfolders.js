import { fetchSubfolders } from "@api/drive.api.js";
import { useQuery } from "@tanstack/react-query";

// Backs the file manager's folder tree — each node only fetches its own
// children when expanded (enabled), rather than pulling the whole show's
// folder structure up front.
export function useSubfolders(folderId, enabled = true) {
  return useQuery({
    queryKey: ["drive-subfolders", folderId],
    queryFn: () =>
      fetchSubfolders(folderId).then((folders) =>
        [...folders].sort((a, b) => a.name.localeCompare(b.name))
      ),
    enabled: !!folderId && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}
