import {
  deleteSchedule,
  fetchSchedules,
  upsertSchedule,
} from "@api/reports.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useReportSchedules = () =>
  useQuery({ queryKey: ["report-schedules"], queryFn: fetchSchedules });

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
