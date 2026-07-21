import {
  deleteSchedule,
  fetchSchedules,
  upsertSchedule,
} from "@api/reports.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useReportSchedules = () =>
  useQuery({
    queryKey: ["report-schedules"],
    queryFn: fetchSchedules,
    // Schedules can be seeded/deleted outside the app's own write path
    // (migrations, admin scripts) — see queryClient.js's admin-config
    // exclusion. staleTime:0 covers "correct the moment you open this
    // panel"; refetchInterval covers "still correct if you leave it open" —
    // a cron job's lastRunAt/lastResult can change server-side at any
    // moment with nobody touching the app to trigger a refresh.
    staleTime: 0,
    refetchInterval: 30_000,
  });

export const useUpsertSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report-schedules"] }),
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report-schedules"] }),
  });
};
