import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function CoreSection({ show }) {
  return (
    <section id="core" className={styles.section}>
      <SectionHeader title="Core" />
      <div className={styles.readOnlyGrid}>
        <span className={styles.label}>Date</span>
        <span className={styles.value}>{formatDate(show.date)}</span>

        <span className={styles.label}>Multiple Shows</span>
        <span className={styles.value}>{show.isMulti ? "Yes" : "No"}</span>

        <span className={styles.label}>Unparsed</span>
        <span className={styles.value}>{show.unparsed ? "Yes" : "No"}</span>
      </div>
    </section>
  );
}
