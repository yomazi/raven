import { generateReport } from "@api/reports.api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useGenerateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => generateReport(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report-schedules"] }),
  });
};
