import {
  createContact,
  deleteContact,
  fetchContact,
  fetchContacts,
  updateContact,
} from "@api/contacts.api.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupKeys } from "./useGroups.js";

// ─── query key factory ───────────────────────────────────────────────────────

export const contactKeys = {
  all: ["contacts"],
  detail: (id) => ["contacts", "detail", id],
};

// ─── hooks ───────────────────────────────────────────────────────────────────

export function useContacts() {
  return useQuery({
    queryKey: contactKeys.all,
    queryFn: fetchContacts,
  });
}

export function useContact(id) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => fetchContact(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      // Groups embed populated contact data (name/email), so a contact
      // edit can make an already-cached group list stale.
      qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      // Deleting a contact also pulls it out of any groups server-side.
      qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}
