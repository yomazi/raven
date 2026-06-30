import apiClient from "./client.js";

export const fetchReports = async () => {
  const { data } = await apiClient.get("/reports");
  return data;
};

export const generateReport = async (name) => {
  const { data } = await apiClient.post("/reports/generate", { name });
  return data;
};

export const fetchSchedules = async () => {
  const { data } = await apiClient.get("/reports/schedules");
  return data;
};

export const upsertSchedule = async ({ reportName, cronExpression, enabled }) => {
  const { data } = await apiClient.put(`/reports/schedules/${reportName}`, {
    cronExpression,
    enabled,
  });
  return data;
};

export const deleteSchedule = async (reportName) => {
  const { data } = await apiClient.delete(`/reports/schedules/${reportName}`);
  return data;
};
