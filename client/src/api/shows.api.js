import apiClient from "./client.js";

export const fetchShows = async () => {
  const { data } = await apiClient.get("/shows");
  console.log("fetchShows response:", data);
  return data.shows;
};

export const syncShows = async (fromDate = null) => {
  const { data } = await apiClient.post("/drive/sync", { fromDate });
  return data;
};

export const fetchShowById = async (googleFolderId) => {
  const { data } = await apiClient.get(`/shows/${googleFolderId}`);
  return data.show;
};
