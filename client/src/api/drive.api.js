// client/src/api/drive.api.js

import apiClient from "./client.js";

export const fetchFolderFiles = async (folderId) => {
  const { data } = await apiClient.get(`/drive/folders/${folderId}/files`);
  return data.files;
};

export const fetchFileText = async (fileId, mimeType) => {
  const { data } = await apiClient.get(`/drive/files/${fileId}/text`, {
    params: { mimeType },
  });
  return data.text;
};

export const uploadToDrive = async ({ blob, filename, mimeType, folderId }) => {
  const fd = new FormData();
  fd.append("file", blob, filename);
  fd.append("filename", filename);
  fd.append("mimeType", mimeType);
  fd.append("folderId", folderId);
  const { data } = await apiClient.post("/drive/upload", fd);
  return data;
};
