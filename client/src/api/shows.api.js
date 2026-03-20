import apiClient from "./client.js";

export const fetchShows = async () => {
  const { data } = await apiClient.get("/shows");
  console.log("fetchShows response:", data);
  return data.shows;
};

export const syncShows = async (fromDate = null) => {
  const body = fromDate ? { fromDate } : {};
  const { data } = await apiClient.post("/drive/sync", body);
  return data;
};

export const fetchShowById = async (googleFolderId) => {
  const { data } = await apiClient.get(`/shows/${googleFolderId}`);
  return data.show;
};
