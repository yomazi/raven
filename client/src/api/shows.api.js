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

export const renameShowFolder = async ({ googleFolderId, artist }) => {
  const { data } = await apiClient.post("/drive/folders/show/rename", { googleFolderId, artist });
  return data;
};

export const rescheduleShowFolder = async ({ googleFolderId, artist, date, multipleShows }) => {
  const { data } = await apiClient.post("/drive/folders/show/reschedule", {
    googleFolderId,
    artist,
    date: date.toISOString().slice(0, 10),
    multipleShows,
  });
  return data;
};

export const deleteShowFolder = async ({ googleFolderId }) => {
  const { data } = await apiClient.post("/drive/folders/show/delete", { googleFolderId });
  return data;
};

export const setShowCanceled = async ({ googleFolderId, canceled }) => {
  const { data } = await apiClient.post("/drive/folders/show/cancel", { googleFolderId, canceled });
  return data;
};

export const createSettlementWorkbook = async ({ googleFolderId }) => {
  const { data } = await apiClient.post("/drive/settlement-workbook", { googleFolderId });
  return data;
};

export const createMarketingAssetsFolder = async ({ googleFolderId }) => {
  const { data } = await apiClient.post("/drive/marketing-assets-folder", { googleFolderId });
  return data;
};

export const patchShow = async (googleFolderId, updates) => {
  const { data } = await apiClient.patch(`/shows/${googleFolderId}`, updates);
  return data.show;
};
