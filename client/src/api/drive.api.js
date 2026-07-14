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

export const fetchSubfolders = async (folderId) => {
  const { data } = await apiClient.get(`/drive/folders/${folderId}/subfolders`);
  return data.folders;
};

export const downloadDriveFile = async (fileId) => {
  const response = await apiClient.get(`/drive/files/${fileId}/download`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] ?? "";
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = decodeURIComponent(utf8Match?.[1] ?? plainMatch?.[1] ?? "download");

  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

export const createContractFolder = async (googleFolderId, signee) => {
  const { data } = await apiClient.post("/drive/contract-folder", { googleFolderId, signee });
  return data;
};

export const archiveContractFolder = async (googleFolderId, contractId) => {
  const { data } = await apiClient.post(`/drive/contracts/${contractId}/archive`, {
    googleFolderId,
  });
  return data;
};

export const renameContractFolder = async (googleFolderId, contractId, signee) => {
  const { data } = await apiClient.post(`/drive/contracts/${contractId}/rename`, {
    googleFolderId,
    signee,
  });
  return data;
};

export const generateContractDoc = async (googleFolderId, contractId) => {
  const { data } = await apiClient.post(`/drive/contracts/${contractId}/generate`, {
    googleFolderId,
  });
  return data;
};

export const fetchImportableContractFolders = async (googleFolderId) => {
  const { data } = await apiClient.get(
    `/drive/folders/${googleFolderId}/importable-contract-folders`
  );
  return data.folders;
};

export const importContractFolder = async (googleFolderId, subfolderId) => {
  const { data } = await apiClient.post("/drive/contract-folder/import", {
    googleFolderId,
    subfolderId,
  });
  return data;
};
