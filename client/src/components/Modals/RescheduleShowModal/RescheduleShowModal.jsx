import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useRescheduleShow } from "../../../hooks/useRescheduleShow.js";
import styles from "./RescheduleShowModal.module.css";

// Local-timezone-safe date-input formatter — a plain `toISOString().slice(0, 10)`
// can shift a day for dates stored as local midnight (see
// DriveRepository.#parseProductionFolder) once the client's timezone is
// behind UTC.
const toDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatLongDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const RescheduleShowModal = ({
  open,
  onOpenChange,
  googleFolderId,
  currentArtist,
  currentDate,
  currentMultipleShows,
}) => {
  const [artist, setArtist] = useState(currentArtist ?? "");
  const [date, setDate] = useState(() => toDateInputValue(currentDate));
  const [multipleShows, setMultipleShows] = useState(!!currentMultipleShows);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const { mutate: rescheduleShow, isPending } = useRescheduleShow({
    onSuccess: () => {
      onOpenChange(false);
    },
    onError: (err) => {
      setConfirming(false);
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!artist.trim()) {
      setError("Artist name is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!googleFolderId) {
      setError("No show is selected.");
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const handleConfirm = () => {
    rescheduleShow({ googleFolderId, artist, date: new Date(date), multipleShows });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          {confirming ? (
            <>
              <Dialog.Title className={styles.title}>Reschedule Show?</Dialog.Title>
              <p className={styles.message}>
                Move &ldquo;{artist}&rdquo; to {formatLongDate(date)}
                {multipleShows ? " (multiple shows)" : ""}? This will move and rename the show&apos;s
                folder on Google Drive and update its record in Raven.
              </p>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button
                  className={styles.buttonSecondary}
                  onClick={() => setConfirming(false)}
                  disabled={isPending}
                >
                  Back
                </button>
                <button className={styles.buttonPrimary} onClick={handleConfirm} disabled={isPending}>
                  {isPending ? "Rescheduling…" : "Reschedule Show"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className={styles.title}>Reschedule Show</Dialog.Title>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="rescheduleArtist">
                  Artist
                </label>
                <input
                  id="rescheduleArtist"
                  className={styles.input}
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="rescheduleDate">
                  Date
                </label>
                <input
                  id="rescheduleDate"
                  className={styles.input}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className={styles.fieldInline}>
                <input
                  id="rescheduleMultipleShows"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={multipleShows}
                  onChange={(e) => setMultipleShows(e.target.checked)}
                />
                <label className={styles.label} htmlFor="rescheduleMultipleShows">
                  Multiple shows
                </label>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button className={styles.buttonSecondary} onClick={() => onOpenChange(false)}>
                  Cancel
                </button>
                <button className={styles.buttonPrimary} onClick={handleSubmit}>
                  Reschedule
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RescheduleShowModal;
