import { fetchSettings, updateSetting } from "@api/settings.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const settingsKeys = {
  all: ["settings"],
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: fetchSettings,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSetting,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
