import { fetchReports } from "@api/reports.api.js";
import { useQuery } from "@tanstack/react-query";

export const useReports = () =>
  useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    // The report registry can change outside the app's own write path
    // (deploys, migrations) — see queryClient.js's admin-config exclusion.
    staleTime: 0,
    refetchInterval: 30_000,
  });
