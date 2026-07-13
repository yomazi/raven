import apiClient from "./client.js";

export const fetchSettings = async () => {
  const { data } = await apiClient.get("/settings");

  return data.settings;
};

export const updateSetting = async ({ key, value }) => {
  const { data } = await apiClient.patch(`/settings/${key}`, { value });

  return data.setting;
};
