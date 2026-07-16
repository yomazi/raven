import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useRenameShow } from "../../../hooks/useRenameShow.js";
import styles from "./RenameShowModal.module.css";

const RenameShowModal = ({ open, onOpenChange, googleFolderId, currentArtist }) => {
  const [artist, setArtist] = useState(currentArtist ?? "");
  const [error, setError] = useState(null);

  const { mutate: renameShow, isPending } = useRenameShow({
    onSuccess: () => {
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!artist.trim()) {
      setError("Show name is required.");
      return;
    }
    if (!googleFolderId) {
      setError("No show is selected.");
      return;
    }
    setError(null);
    renameShow({ googleFolderId, artist });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>Rename Show</Dialog.Title>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="renameArtist">
              New Name
            </label>
            <input
              id="renameArtist"
              className={styles.input}
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
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
              {isPending ? "Renaming…" : "Rename"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RenameShowModal;
