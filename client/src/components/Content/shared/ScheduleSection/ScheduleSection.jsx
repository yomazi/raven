import { RELEASE_MODES, RELEASE_MODE_LABELS } from "@shared/constants/schedule.js";
import { useCallback, useState } from "react";
import styles from "./ScheduleSection.module.css";

// datetime-local inputs expect local time, not UTC
function toDateTimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// PresaleRow — one presale with local draft for the name field
// ---------------------------------------------------------------------------

function PresaleRow({ presale, index, onUpdate, onRemove }) {
  const [draftName, setDraftName] = useState(null); // null = not editing

  const displayName = draftName ?? presale.name ?? "Donor Presale";

  function handleNameBlur() {
    if (draftName !== null && draftName !== presale.name) {
      onUpdate(index, { name: draftName });
    }
    setDraftName(null); // exit draft mode; prop is now source of truth again
  }

  return (
    <div className={styles.presaleCard}>
      <div className={styles.presaleCardHeader}>
        <span className={styles.presaleCardTitle}>Presale {index + 1}</span>
        <button className={styles.removeButton} onClick={() => onRemove(index)}>
          Remove
        </button>
      </div>

      <div className={styles.scheduleGrid}>
        <span className={styles.scheduleLabel}>Name</span>
        <input
          type="text"
          className={styles.textInput}
          value={displayName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={handleNameBlur}
        />

        <span className={styles.scheduleLabel}>Start</span>
        <input
          type="datetime-local"
          className={styles.dateInput}
          value={toDateTimeLocal(presale.startDateTime)}
          onChange={(e) =>
            onUpdate(index, {
              startDateTime: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />

        <span className={styles.scheduleLabel}>End</span>
        <input
          type="datetime-local"
          className={styles.dateInput}
          value={toDateTimeLocal(presale.endDateTime)}
          onChange={(e) =>
            onUpdate(index, {
              endDateTime: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleSection
// ---------------------------------------------------------------------------

export default function ScheduleSection({
  schedule,
  initialNotes,
  setField,
  setReleaseMode,
  addPresale,
  updatePresale,
  removePresale,
}) {
  const presales = schedule.presales ?? [];
  const releaseMode = schedule.releaseMode ?? "asap";
  const isOnSchedule = releaseMode === "on-schedule";
  const showDates = releaseMode === "on-schedule" || releaseMode === "tbd";

  const handleBlurNotes = useCallback((e) => setField("notes", e.target.value), [setField]);

  return (
    <div className={styles.contextPane}>
      <div className={styles.scheduleGrid}>
        <span className={styles.scheduleLabel}>Release</span>
        <div className={styles.radioGroup}>
          {RELEASE_MODES.map((mode) => (
            <label key={mode} className={styles.radioLabel}>
              <input
                type="radio"
                name="build-release-mode"
                className={styles.radio}
                checked={releaseMode === mode}
                onChange={() => setReleaseMode(mode)}
              />
              {RELEASE_MODE_LABELS[mode]}
            </label>
          ))}
        </div>

        {showDates && (
          <>
            <span className={styles.scheduleLabel}>Announce Date</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={toDateTimeLocal(schedule.announceDateTime)}
              onChange={(e) =>
                setField("announceDateTime", e.target.value ? new Date(e.target.value) : null)
              }
            />

            <span className={styles.scheduleLabel}>On Sale Date</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={toDateTimeLocal(schedule.onSaleDateTime)}
              onChange={(e) =>
                setField("onSaleDateTime", e.target.value ? new Date(e.target.value) : null)
              }
            />
          </>
        )}
      </div>

      {isOnSchedule && (
        <>
          {presales.length > 0 && (
            <div className={styles.presalesGroup}>
              {presales.map((presale, i) => (
                <PresaleRow
                  key={i}
                  presale={presale}
                  index={i}
                  onUpdate={updatePresale}
                  onRemove={removePresale}
                />
              ))}
            </div>
          )}

          <button className={styles.addPresaleBtn} onClick={addPresale}>
            + Add Presale
          </button>
        </>
      )}

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Announce / On Sale notes</span>
        <textarea
          className={styles.textarea}
          defaultValue={initialNotes ?? ""}
          onBlur={handleBlurNotes}
          rows={2}
        />
      </div>
    </div>
  );
}
