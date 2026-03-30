import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSettlementWorkbook } from "../api/shows.api.js";
import useRavenStore from "../store/useRavenStore.js";

const FADE_DELAY_MS = 5000;

export const useCreateSettlementWorkbook = ({ onSuccess, onError } = {}) => {
  const queryClient = useQueryClient();
  const { setSyncPhase, clearSyncPhase, setStatusMessage, clearStatusMessage } = useRavenStore();

  return useMutation({
    mutationFn: createSettlementWorkbook,

    onMutate: () => {
      setSyncPhase("syncing", "Creating settlement workbook…");
    },

    onSuccess: (data) => {
      clearSyncPhase();
      queryClient.invalidateQueries({ queryKey: ["shows"] });
      setStatusMessage(`Settlement workbook created — ${data.name}`, "success");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onSuccess?.(data);
    },

    onError: (err) => {
      clearSyncPhase();
      setStatusMessage(`Failed to create workbook: ${err.message}`, "error");
      setTimeout(clearStatusMessage, FADE_DELAY_MS);
      onError?.(err);
    },
  });
};
