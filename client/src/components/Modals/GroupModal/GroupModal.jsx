import { useContacts } from "@hooks/useContacts.js";
import { useCreateGroup, useUpdateGroup } from "@hooks/useGroups.js";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import styles from "./GroupModal.module.css";

/**
 * GroupModal
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   group         object | null   — if provided, we're editing; otherwise creating
 */
export default function GroupModal({ open, onOpenChange, group = null }) {
  const isEditing = !!group;

  const { data: contacts = [] } = useContacts();

  const [name, setName] = useState("");
  const [contactIds, setContactIds] = useState(new Set());
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const isPending = createGroup.isPending || updateGroup.isPending;

  useEffect(() => {
    if (!open) return;
    setName(isEditing ? (group.name ?? "") : "");
    setContactIds(new Set(isEditing ? (group.contacts ?? []).map((c) => c._id) : []));
    setError(null);
    requestAnimationFrame(() => nameRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleContact(id) {
    setContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      nameRef.current?.focus();
      return;
    }

    const payload = { name: name.trim(), contacts: [...contactIds] };

    try {
      if (isEditing) {
        await updateGroup.mutateAsync({ id: group._id, ...payload });
      } else {
        await createGroup.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? "Something went wrong.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>
            {isEditing ? "Edit Group" : "New Group"}
          </Dialog.Title>

          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label} htmlFor="group-name">
            Name <span aria-hidden>*</span>
          </label>
          <input
            id="group-name"
            ref={nameRef}
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Finance"
          />

          <label className={styles.label}>Members</label>
          <div className={styles.memberList}>
            {contacts.length === 0 && <div className={styles.memberEmpty}>No contacts yet.</div>}
            {contacts.map((c) => (
              <label key={c._id} className={styles.memberRow}>
                <input
                  type="checkbox"
                  checked={contactIds.has(c._id)}
                  onChange={() => toggleContact(c._id)}
                />
                <span className={styles.memberName}>{c.name}</span>
                <span className={styles.memberEmail}>{c.email}</span>
              </label>
            ))}
          </div>

          <div className={styles.actions}>
            <Dialog.Close asChild>
              <button className={styles.btnCancel} disabled={isPending}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={styles.btnSave}
              onClick={handleSave}
              disabled={isPending}
              data-pending={isPending || undefined}
            >
              {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Group"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
