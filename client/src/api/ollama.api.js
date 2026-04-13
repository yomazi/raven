// client/src/api/ollama.api.js

import apiClient from "./client.js";

export const fetchOllamaHealth = async () => {
  const { data } = await apiClient.get("/ollama/health");
  return data;
};

export const extractOfferLetter = async (text, { model } = {}) => {
  const { data } = await apiClient.post(`/ollama/extract`, { text, model });
  return data;
};
