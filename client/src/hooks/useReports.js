import { fetchReports } from "@api/reports.api.js";
import { useQuery } from "@tanstack/react-query";

export const useReports = () =>
  useQuery({ queryKey: ["reports"], queryFn: fetchReports });
