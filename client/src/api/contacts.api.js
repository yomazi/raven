import apiClient from "./client.js";

export const fetchContacts = async () => {
  const { data } = await apiClient.get("/contacts");

  return data.contacts;
};

export const fetchContact = async (id) => {
  const { data } = await apiClient.get(`/contacts/${id}`);

  return data.contact;
};

export const createContact = async (payload) => {
  const { data } = await apiClient.post("/contacts", payload);

  return data.contact;
};

export const updateContact = async ({ id, ...payload }) => {
  const { data } = await apiClient.patch(`/contacts/${id}`, payload);

  return data.contact;
};

export const deleteContact = async (id) => {
  const { data } = await apiClient.delete(`/contacts/${id}`);

  return data;
};
