import { RELEASE_MODES, RELEASE_MODE_LABELS } from "@shared/constants/schedule.js";
import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const toDateTimeLocal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ScheduleSection({ show, setField }) {
  const schedule = show.schedule ?? {};
  const presales = schedule.presales ?? [];
  const releaseMode = schedule.releaseMode ?? "asap";
  const isOnSchedule = releaseMode === "on-schedule";
  const showDates = releaseMode === "on-schedule" || releaseMode === "tbd";

  // While "On Schedule" is selected, the first presale is locked to the
  // announce/on-sale dates — editing either propagates to the other.
  const updatePresale = (index, field, value) => {
    const updated = presales.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setField("schedule.presales", updated);

    if (index !== 0 || !isOnSchedule) return;
    if (field === "startDateTime") setField("schedule.announceDateTime", value);
    if (field === "endDateTime") setField("schedule.onSaleDateTime", value);
  };

  const addPresale = () => {
    // The first presale added while "On Schedule" is selected is locked to
    // the announce/on-sale dates; later presales start blank.
    const lockToSchedule = presales.length === 0 && isOnSchedule;
    setField("schedule.presales", [
      ...presales,
      {
        name: "Donor Presale",
        startDateTime: lockToSchedule ? (schedule.announceDateTime ?? null) : null,
        endDateTime: lockToSchedule ? (schedule.onSaleDateTime ?? null) : null,
      },
    ]);
  };

  const removePresale = (index) => {
    setField(
      "schedule.presales",
      presales.filter((_, i) => i !== index)
    );
  };

  // Switching to "On Schedule" defaults empty announce/on-sale dates to
  // today at 1pm, without touching dates that are already set.
  const handleReleaseModeChange = (mode) => {
    setField("schedule.releaseMode", mode);
    if (mode !== "on-schedule") return;

    const defaultTime = new Date();
    defaultTime.setHours(13, 0, 0, 0);

    if (!schedule.announceDateTime) setField("schedule.announceDateTime", defaultTime);
    if (!schedule.onSaleDateTime) setField("schedule.onSaleDateTime", defaultTime);
  };

  // While "On Schedule" is selected, the first presale is locked to the
  // announce/on-sale dates — editing either propagates to the other.
  const handleAnnounceDateChange = (value) => {
    setField("schedule.announceDateTime", value);
    if (!isOnSchedule || presales.length === 0) return;
    setField(
      "schedule.presales",
      presales.map((p, i) => (i === 0 ? { ...p, startDateTime: value } : p))
    );
  };

  const handleOnSaleDateChange = (value) => {
    setField("schedule.onSaleDateTime", value);
    if (!isOnSchedule || presales.length === 0) return;
    setField(
      "schedule.presales",
      presales.map((p, i) => (i === 0 ? { ...p, endDateTime: value } : p))
    );
  };

  return (
    <section id="schedule" className={styles.section}>
      <SectionHeader title="Schedule" />

      <div className={styles.fieldGrid}>
        <span className={styles.label}>Release</span>
        <div className={styles.radioGroup}>
          {RELEASE_MODES.map((mode) => (
            <label key={mode} className={styles.radioLabel}>
              <input
                type="radio"
                name="release-mode"
                className={styles.radio}
                checked={releaseMode === mode}
                onChange={() => handleReleaseModeChange(mode)}
              />
              {RELEASE_MODE_LABELS[mode]}
            </label>
          ))}
        </div>
      </div>

      {showDates && (
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="schedule-announce">
            Announce Date
          </label>
          <input
            id="schedule-announce"
            className={styles.input}
            type="datetime-local"
            value={toDateTimeLocal(schedule.announceDateTime)}
            onChange={(e) =>
              handleAnnounceDateChange(e.target.value ? new Date(e.target.value) : null)
            }
          />

          <label className={styles.label} htmlFor="schedule-onsale">
            On Sale Date
          </label>
          <input
            id="schedule-onsale"
            className={styles.input}
            type="datetime-local"
            value={toDateTimeLocal(schedule.onSaleDateTime)}
            onChange={(e) =>
              handleOnSaleDateChange(e.target.value ? new Date(e.target.value) : null)
            }
          />
        </div>
      )}

      {isOnSchedule && (
        <>
          {presales.length > 0 && (
            <div className={styles.subSectionGroup}>
              <h4 className={styles.subSectionTitle}>Presales</h4>
              {presales.map((presale, i) => (
                <div key={i} className={styles.subSection}>
                  <div className={styles.subSectionTitleRow}>
                    <h4 className={styles.subSectionTitle}>Presale {i + 1}</h4>
                    <button className={styles.removeButton} onClick={() => removePresale(i)}>
                      Remove
                    </button>
                  </div>

                  <div className={styles.fieldGrid}>
                    <label className={styles.label} htmlFor={`presale-name-${i}`}>
                      Name
                    </label>
                    <input
                      id={`presale-name-${i}`}
                      className={styles.input}
                      type="text"
                      value={presale.name ?? "Donor Presale"}
                      onChange={(e) => updatePresale(i, "name", e.target.value)}
                    />

                    <label className={styles.label} htmlFor={`presale-start-${i}`}>
                      Start
                    </label>
                    <input
                      id={`presale-start-${i}`}
                      className={styles.input}
                      type="datetime-local"
                      value={toDateTimeLocal(presale.startDateTime)}
                      onChange={(e) =>
                        updatePresale(
                          i,
                          "startDateTime",
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />

                    <label className={styles.label} htmlFor={`presale-end-${i}`}>
                      End
                    </label>
                    <input
                      id={`presale-end-${i}`}
                      className={styles.input}
                      type="datetime-local"
                      value={toDateTimeLocal(presale.endDateTime)}
                      onChange={(e) =>
                        updatePresale(
                          i,
                          "endDateTime",
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className={styles.addButton} onClick={addPresale}>
            + Add Presale
          </button>
        </>
      )}
    </section>
  );
}
