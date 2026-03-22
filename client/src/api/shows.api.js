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
  try {
    const response = await apiClient.get(`/shows/${googleFolderId}`);
    return response.data.show;
  } catch (err) {
    const status = err.response?.status;
    throw new Error(status === 404 ? "not found." : `(${status}).`);
  }
};

export const createShowFolder = async ({ artist, date, multipleShows }) => {
  const { data } = await apiClient.post("/drive/folders/show", {
    artist,
    date: date.toISOString().slice(0, 10),
    multipleShows,
  });
  return data;
};
