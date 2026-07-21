import apiClient from "./client.js";

export const fetchApiTokens = async () => {
  const { data } = await apiClient.get("/api-tokens");

  return data.tokens;
};

export const createApiToken = async ({ name }) => {
  const { data } = await apiClient.post("/api-tokens", { name });

  return data;
};

export const revokeApiToken = async (id) => {
  await apiClient.delete(`/api-tokens/${id}`);
};
