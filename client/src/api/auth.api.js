// client/src/api/auth.api.js

import apiClient from "./client.js";

export const loginWithToken = async (token) => {
  const { data } = await apiClient.post("/auth/token-login", { token });
  return data;
};
