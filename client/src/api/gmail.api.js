// src/api/gmail.api.js

import apiClient from "./client.js";

export const fetchThread = async (threadId) => {
  const { data } = await apiClient.get(`/gmail/threads/${threadId}`);
  return data;
};

export const fetchMessage = async (messageId) => {
  const { data } = await apiClient.get(`/gmail/messages/${messageId}`);
  return data;
};

export const fetchAttachment = async (messageId, attachmentId) => {
  const response = await apiClient.get(`/gmail/attachments/${messageId}/${attachmentId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const sendMessage = async ({ to, subject, body, from, sentLabels }) => {
  const { data } = await apiClient.post("/gmail/messages/send", {
    to,
    subject,
    body,
    from,
    sentLabels,
  });
  return data;
};

export const replyToMessage = async (messageId, { body, from, threadLabels, sentLabels }) => {
  const { data } = await apiClient.post(`/gmail/messages/${messageId}/reply`, {
    body,
    from,
    threadLabels,
    sentLabels,
  });
  return data;
};

export const forwardMessage = async (messageId, { to, body, from, threadLabels, sentLabels }) => {
  const { data } = await apiClient.post(`/gmail/messages/${messageId}/forward`, {
    to,
    body,
    from,
    threadLabels,
    sentLabels,
  });
  return data;
};

export const labelThread = async (messageId, labels) => {
  const { data } = await apiClient.post(`/gmail/messages/${messageId}/label`, { labels });
  return data;
};

export const fetchDriveFiles = async (folderId) => {
  const { data } = await apiClient.get(`/drive/folders/${folderId}/files`);
  return data.files;
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
