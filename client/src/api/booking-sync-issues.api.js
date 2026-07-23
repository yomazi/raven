import apiClient from "./client.js";

export const fetchBookingSyncIssues = async () => {
  const { data } = await apiClient.get("/booking-sync-issues");
  return data.issues;
};

export const addRowForIssue = async (id) => {
  const { data } = await apiClient.post(`/booking-sync-issues/${id}/add-row`);
  return data.issue;
};

export const dismissIssue = async (id) => {
  const { data } = await apiClient.post(`/booking-sync-issues/${id}/dismiss`);
  return data.issue;
};

export const syncContractBookingSheet = async ({ googleFolderId, contractId }) => {
  const { data } = await apiClient.post(
    `/shows/${googleFolderId}/contracts/${contractId}/booking-sync`
  );
  return data;
};
