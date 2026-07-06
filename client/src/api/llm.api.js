// client/src/api/llm.api.js

import apiClient from "./client.js";

export const fetchLlmHealth = async () => {
  const { data } = await apiClient.get("/llm/health");
  return data;
};

export const extractOfferLetter = async (text) => {
  const { data } = await apiClient.post("/llm/extract", { text });
  return data;
};
