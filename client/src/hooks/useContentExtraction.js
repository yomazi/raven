// client/src/hooks/useContractExtraction.js

import { extractOfferLetter } from "@api/ollama.api.js";
import { patchShow } from "@api/shows.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useContentExtraction(googleFolderId) {
  const queryClient = useQueryClient();

  const {
    mutateAsync: extract,
    data: extracted,
    isPending: isExtracting,
    isSuccess: isExtracted,
    isError: isExtractionError,
    error: extractionError,
    reset,
  } = useMutation({
    mutationFn: ({ text, model }) => extractOfferLetter(text, { model }),
  });

  const {
    mutateAsync: apply,
    isPending: isApplying,
    isSuccess: isApplied,
    isError: isApplyError,
    error: applyError,
  } = useMutation({
    mutationFn: (extractedData) => patchShow(googleFolderId, extractedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show", googleFolderId] });
    },
  });

  return {
    extract, // ({ text, model? }) → populates extracted
    extracted: extracted?.extracted ?? null, // preview this before applying
    apply, // (extractedData) → patches the show directly
    isExtracting,
    isExtracted,
    isExtractionError,
    extractionError,
    isApplying,
    isApplied,
    isApplyError,
    applyError,
    reset,
  };
}
