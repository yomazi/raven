import { fetchImportableContractFolders } from "@api/drive.api.js";
import { useQuery } from "@tanstack/react-query";

// Only fetched while the Import Contract picker is open (via `enabled`) —
// and never cached, since it must reflect whatever's really in Drive right
// now, not what was there the last time this picker was opened.
export function useImportableContractFolders(googleFolderId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["importable-contract-folders", googleFolderId],
    queryFn: () => fetchImportableContractFolders(googleFolderId),
    enabled: enabled && !!googleFolderId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}
