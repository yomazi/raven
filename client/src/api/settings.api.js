import apiClient from "./client.js";

export const fetchSettings = async () => {
  const { data } = await apiClient.get("/settings");

  return { settings: data.settings, environment: data.environment };
};

export const updateSetting = async ({ key, environment, value }) => {
  const { data } = await apiClient.patch(`/settings/${key}`, { environment, value });

  return data.setting;
};
