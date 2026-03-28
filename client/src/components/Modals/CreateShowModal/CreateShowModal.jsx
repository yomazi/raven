import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useCreateShow } from "../../../hooks/useCreateShow.js";
import styles from "./CreateShowModal.module.css";

const today = () => new Date().toISOString().slice(0, 10);

const CreateShowModal = ({ open, onOpenChange }) => {
  const [artist, setArtist] = useState("");
  const [date, setDate] = useState(today);
  const [multipleShows, setMultipleShows] = useState(false);
  const [error, setError] = useState(null);

  const { mutate: createShow, isPending } = useCreateShow({
    onSuccess: () => {
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!artist.trim()) {
      setError("Artist name is required.");
      return;
    }
    setError(null);
    createShow({ artist, date: new Date(date), multipleShows });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>Create a New Show Folder</Dialog.Title>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="artist">
              Artist
            </label>
            <input
              id="artist"
              className={styles.input}
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="date">
              Date
            </label>
            <input
              id="date"
              className={styles.input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className={styles.fieldInline}>
            <input
              id="multipleShows"
              type="checkbox"
              className={styles.checkbox}
              checked={multipleShows}
              onChange={(e) => setMultipleShows(e.target.checked)}
            />
            <label className={styles.label} htmlFor="multipleShows">
              Multiple shows
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button className={styles.buttonPrimary} onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating…" : "Create Folder"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CreateShowModal;
