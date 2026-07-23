import {
  addRowForIssue,
  dismissIssue,
  fetchBookingSyncIssues,
  syncContractBookingSheet,
} from "@api/booking-sync-issues.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const QUERY_KEY = ["booking-sync-issues"];

export const useBookingSyncIssues = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBookingSyncIssues,
    staleTime: 0,
    refetchInterval: 30_000,
  });

export const useAddRowForIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addRowForIssue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useDismissIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissIssue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSyncContractBookingSheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncContractBookingSheet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
