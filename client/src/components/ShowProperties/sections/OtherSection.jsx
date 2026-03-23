import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const SET_LENGTH_OPTIONS = ["1 x 90 minute set", "2 x 45 minute sets w/ intermission", "other"];

export default function OtherSection({ show, setField }) {
  const misc = show.misc ?? {};

  return (
    <section id="misc" className={styles.section}>
      <SectionHeader title="Other" />
      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="misc-other">
          Notes
        </label>
        <textarea
          id="misc-other"
          className={styles.textarea}
          value={misc.other ?? ""}
          onChange={(e) => setField("misc.other", e.target.value)}
          rows={4}
        />
      </div>
    </section>
  );
}
