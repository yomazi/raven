import { useCreateTask, useUpdateTask } from "@hooks/useTasks";
import * as Dialog from "@radix-ui/react-dialog";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
} from "@shared/constants/tasks.js";
import { useEffect, useRef, useState } from "react";
import styles from "./AddTaskModal.module.css";

const EMPTY_FORM = {
  description: "",
  priority: "medium",
  status: "open",
  notes: "",
  showFolderId: null,
};

/**
 * TaskModal
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (open: boolean) => void
 *   task          object | null   — if provided, we're editing; otherwise creating
 *   showFolderId  string | null   — pre-populate for show-linked quick-add
 *   showLabel     string | null   — e.g. "2026-10-24 · John Gorka" for display
 */
export default function TaskModal({
  open,
  onOpenChange,
  task = null,
  showFolderId = null,
  showLabel = null,
}) {
  const isEditing = !!task;

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const descRef = useRef(null);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isPending = createTask.isPending || updateTask.isPending;

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;
    if (isEditing) {
      // This is a legitimate external sync: populating form from prop data when modal opens, not from React state
      // eslint-disable-next-line
      setForm({
        description: task.description ?? "",
        priority: task.priority ?? "medium",
        status: task.status ?? "open",
        notes: task.notes ?? "",
        showFolderId: task.showFolderId ?? null,
      });
    } else {
      setForm({ ...EMPTY_FORM, showFolderId: showFolderId ?? null });
    }
    setError(null);
    // Focus description on next frame
    requestAnimationFrame(() => descRef.current?.focus());
  }, [open]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setError(null);
    if (!form.description.trim()) {
      setError("Description is required.");
      descRef.current?.focus();
      return;
    }

    const payload = {
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim(),
      showFolderId: form.showFolderId || null,
    };

    try {
      if (isEditing) {
        await updateTask.mutateAsync({ id: task._id, ...payload });
      } else {
        await createTask.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
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
            {isEditing ? "Edit Task" : "New Task"}
          </Dialog.Title>

          {/* Show context badge */}
          {form.showFolderId && showLabel && <div className={styles.showBadge}>{showLabel}</div>}
          {form.showFolderId && !showLabel && (
            <div className={styles.showBadge}>{form.showFolderId}</div>
          )}
          {!form.showFolderId && (
            <div className={styles.showBadge} data-general>
              General task — not linked to a show
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {/* Description */}
          <label className={styles.label} htmlFor="task-description">
            Description <span aria-hidden>*</span>
          </label>
          <textarea
            id="task-description"
            ref={descRef}
            className={styles.textarea}
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="What needs to happen?"
          />

          {/* Priority + Status row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="task-priority">
                Priority
              </label>
              <select
                id="task-priority"
                className={styles.select}
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                {TASK_PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                className={styles.select}
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                {TASK_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <label className={styles.label} htmlFor="task-notes">
            Notes
          </label>
          <textarea
            id="task-notes"
            className={styles.textarea}
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Additional context, links, thoughts…"
          />

          {/* Actions */}
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
              {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Task"}
            </button>
          </div>

          <div className={styles.hint}>⌘ + Enter to save</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
