import { fetchFolderFiles } from "@api/drive.api.js";
import { useQuery } from "@tanstack/react-query";

export function useDriveFiles(folderId) {
  return useQuery({
    queryKey: ["drive-files", folderId],
    queryFn: () => fetchFolderFiles(folderId),
    enabled: !!folderId,
  });
}
