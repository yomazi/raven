import { useCreateContact, useUpdateContact } from "@hooks/useContacts.js";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import styles from "./ContactModal.module.css";

const EMPTY_FORM = { name: "", email: "" };

/**
 * ContactModal
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   contact       object | null   — if provided, we're editing; otherwise creating
 */
export default function ContactModal({ open, onOpenChange, contact = null }) {
  const isEditing = !!contact;

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isPending = createContact.isPending || updateContact.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(isEditing ? { name: contact.name ?? "", email: contact.email ?? "" } : EMPTY_FORM);
    setError(null);
    requestAnimationFrame(() => nameRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      nameRef.current?.focus();
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    const payload = { name: form.name.trim(), email: form.email.trim() };

    try {
      if (isEditing) {
        await updateContact.mutateAsync({ id: contact._id, ...payload });
      } else {
        await createContact.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? "Something went wrong.");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          onKeyDown={handleKeyDown}
          aria-describedby={undefined}
        >
          <Dialog.Title className={styles.title}>
            {isEditing ? "Edit Contact" : "New Contact"}
          </Dialog.Title>

          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label} htmlFor="contact-name">
            Name <span aria-hidden>*</span>
          </label>
          <input
            id="contact-name"
            ref={nameRef}
            className={styles.input}
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Jane Doe"
          />

          <label className={styles.label} htmlFor="contact-email">
            Email <span aria-hidden>*</span>
          </label>
          <input
            id="contact-email"
            className={styles.input}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="jane@example.com"
          />

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
              {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Contact"}
            </button>
          </div>

          <div className={styles.hint}>⌘ + Enter to save</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
