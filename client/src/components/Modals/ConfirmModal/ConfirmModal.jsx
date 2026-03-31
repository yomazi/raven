import * as Dialog from "@radix-ui/react-dialog";
import styles from "./ConfirmModal.module.css";

/**
 * ConfirmModal
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   title         string
 *   message       string | ReactNode
 *   confirmLabel  string  — default "Confirm"
 *   cancelLabel   string  — default "Cancel"
 *   onConfirm     () => void | Promise<void>
 *   danger        boolean — styles the confirm button as destructive
 */
export default function ConfirmModal({
  open,
  onOpenChange,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  danger = false,
}) {
  async function handleConfirm() {
    await onConfirm?.();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          {message && <p className={styles.message}>{message}</p>}
          <div className={styles.actions}>
            <Dialog.Close asChild>
              <button className={styles.btnCancel}>{cancelLabel}</button>
            </Dialog.Close>
            <button
              className={styles.btnConfirm}
              data-danger={danger || undefined}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
