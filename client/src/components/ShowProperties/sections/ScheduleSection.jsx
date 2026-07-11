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

  const updatePresale = (index, field, value) => {
    const updated = presales.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setField("schedule.presales", updated);
  };

  const addPresale = () => {
    setField("schedule.presales", [
      ...presales,
      { name: "Donor Presale", startDateTime: null, endDateTime: null },
    ]);
  };

  const removePresale = (index) => {
    setField(
      "schedule.presales",
      presales.filter((_, i) => i !== index)
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
                onChange={() => setField("schedule.releaseMode", mode)}
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
              setField(
                "schedule.announceDateTime",
                e.target.value ? new Date(e.target.value) : null
              )
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
              setField(
                "schedule.onSaleDateTime",
                e.target.value ? new Date(e.target.value) : null
              )
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
