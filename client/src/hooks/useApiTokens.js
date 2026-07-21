import { createApiToken, fetchApiTokens, revokeApiToken } from "@api/api-tokens.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const apiTokenKeys = {
  all: ["apiTokens"],
};

export function useApiTokens() {
  return useQuery({
    queryKey: apiTokenKeys.all,
    queryFn: fetchApiTokens,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createApiToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: apiTokenKeys.all }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeApiToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: apiTokenKeys.all }),
  });
}
