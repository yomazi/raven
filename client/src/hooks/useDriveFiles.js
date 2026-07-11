import { fetchFolderFiles } from "@api/drive.api.js";
import { useQuery } from "@tanstack/react-query";

// Folder contents change from outside this app (someone uploads/removes a
// file directly in Drive) — a stale list here means a real file becomes
// invisible/unreachable in the picker, so this must never serve a cached
// result: always hit the network, and don't retain anything to serve stale
// once nobody's looking at it.
export function useDriveFiles(folderId) {
  return useQuery({
    queryKey: ["drive-files", folderId],
    queryFn: () => fetchFolderFiles(folderId),
    enabled: !!folderId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}
