import { fetchSettings, updateSetting } from "@api/settings.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const settingsKeys = {
  all: ["settings"],
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: fetchSettings,
    // Settings is small, rarely read, and can change outside the app's own
    // mutation path (e.g. a migration writing straight to Mongo) — the
    // 24h default staleTime elsewhere in the app is wrong here, since
    // nothing would ever tell an already-loaded client to invalidate it.
    // Always prefer a fresh fetch over the persisted/in-memory cache.
    staleTime: 0,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSetting,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
