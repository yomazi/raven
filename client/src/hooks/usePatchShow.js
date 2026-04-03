import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchShow } from "../api/shows.api.js";

export const usePatchShow = (googleFolderId, onSaved) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => patchShow(googleFolderId, updates),
    onSuccess: (updatedShow) => {
      queryClient.setQueryData(["show", googleFolderId], updatedShow);
      queryClient.setQueryData(["shows"], (prev) => {
        if (!prev) return prev;
        return prev.map((s) => (s.googleFolderId === googleFolderId ? updatedShow : s));
      });
      onSaved?.(updatedShow);
    },
  });
};
