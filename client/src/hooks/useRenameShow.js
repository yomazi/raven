import { renameShowFolder } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useRenameShow = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useRavenStore();
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);

  return useMutation({
    mutationFn: renameShowFolder,

    onMutate: () => {
      setSyncPhase("syncing", "Renaming show folder…");
    },

    onSuccess: (data, variables) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      if (data.show) {
        queryClient.setQueryData(["show", variables.googleFolderId], data.show);
        // selectedShow is a Zustand snapshot, not reactively tied to the
        // query cache — refresh it directly so the rest of the app (e.g.
        // this same Nav bar re-opened) doesn't show the stale artist name.
        if (selectedShow?.googleFolderId === variables.googleFolderId) {
          setSelectedShow(data.show);
        }
      }
      setStatusMessage(`Show renamed — ${data.folderName}`, "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to rename show: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
