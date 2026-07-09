import {
  createGroup,
  deleteGroup,
  fetchGroup,
  fetchGroups,
  updateGroup,
} from "@api/groups.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── query key factory ───────────────────────────────────────────────────────

export const groupKeys = {
  all: ["groups"],
  detail: (id) => ["groups", "detail", id],
};

// ─── hooks ───────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.all,
    queryFn: fetchGroups,
  });
}

export function useGroup(id) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: () => fetchGroup(id),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}
