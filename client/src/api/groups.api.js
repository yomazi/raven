import apiClient from "./client.js";

export const fetchGroups = async () => {
  const { data } = await apiClient.get("/groups");

  return data.groups;
};

export const fetchGroup = async (id) => {
  const { data } = await apiClient.get(`/groups/${id}`);

  return data.group;
};

export const createGroup = async (payload) => {
  const { data } = await apiClient.post("/groups", payload);

  return data.group;
};

export const updateGroup = async ({ id, ...payload }) => {
  const { data } = await apiClient.patch(`/groups/${id}`, payload);

  return data.group;
};

export const deleteGroup = async (id) => {
  const { data } = await apiClient.delete(`/groups/${id}`);

  return data;
};
