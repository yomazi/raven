import styles from "./Section.module.css";

export default function SectionHeader({ title }) {
  return (
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionDivider} />
    </div>
  );
}
