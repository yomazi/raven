import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const EPOCH = "2001-01-01";

const toTimeString = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().slice(11, 16); // "HH:MM"
};

const fromTimeString = (timeStr) => {
  if (!timeStr) return null;
  return new Date(`${EPOCH}T${timeStr}:00.000Z`);
};

export default function PerformancesSection({ show, setField }) {
  const performances = show.performances ?? [];

  const updatePerformance = (index, field, value) => {
    const updated = performances.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setField("performances", updated);
  };

  return (
    <section id="performances" className={styles.section}>
      <SectionHeader title="Performances" />

      {performances.length === 0 && <p className={styles.empty}>No performances defined.</p>}

      {performances.map((perf, i) => (
        <div key={i} className={styles.subSection}>
          <h4 className={styles.subSectionTitle}>Performance {i + 1}</h4>

          <div className={styles.fieldGrid}>
            <label className={styles.label}>Date</label>
            <input
              className={styles.input}
              type="date"
              value={perf.date ? new Date(perf.date).toISOString().slice(0, 10) : ""}
              onChange={(e) => updatePerformance(i, "date", new Date(e.target.value))}
            />

            <label className={styles.label}>Door Time</label>
            <input
              className={styles.input}
              type="time"
              value={toTimeString(perf.doorTime)}
              onChange={(e) => updatePerformance(i, "doorTime", fromTimeString(e.target.value))}
            />

            <label className={styles.label}>Show Time</label>
            <input
              className={styles.input}
              type="time"
              value={toTimeString(perf.showTime)}
              onChange={(e) => updatePerformance(i, "showTime", fromTimeString(e.target.value))}
            />

            <label className={styles.label}>Performance Code</label>
            <input
              className={styles.input}
              type="text"
              value={perf.performanceCode ?? ""}
              onChange={(e) => updatePerformance(i, "performanceCode", e.target.value)}
            />

            <label className={styles.label}>Has Livestream</label>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={perf.hasLivestream ?? false}
              onChange={(e) => {
                updatePerformance(i, "hasLivestream", e.target.checked);
              }}
            />
          </div>
        </div>
      ))}

      <button
        className={styles.addButton}
        onClick={() => {
          setField("performances", [
            ...performances,
            {
              date: show.date,
              doorTime: null,
              showTime: null,
              hasLivestream: false,
              performanceCode: "",
            },
          ]);
        }}
      >
        + Add Performance
      </button>
    </section>
  );
}
