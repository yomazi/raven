import apiClient from "./client.js";

export const fetchTasks = async (params = {}) => {
  const { data } = await apiClient.get("/tasks", { params });

  return data.tasks;
};

export const fetchTask = async (id) => {
  const { data } = await apiClient.get(`/tasks/${id}`);

  return data.task;
};

export const createTask = async (payload) => {
  const { data } = await apiClient.post("/tasks", payload);

  return data.task;
};

export const updateTask = async ({ id, ...payload }) => {
  const { data } = await apiClient.patch(`/tasks/${id}`, payload);

  return data.task;
};

export const deleteTask = async (id) => {
  const { data } = await apiClient.delete(`/tasks/${id}`);

  return data;
};
