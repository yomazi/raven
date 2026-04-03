import * as Switch from "@radix-ui/react-switch";
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

export default function CoreSection({ show, setField }) {
  return (
    <section id="core" className={styles.section}>
      <SectionHeader title="Core" />
      <div className={styles.fieldGrid}>
        <span className={styles.label}>Date</span>
        <span className={styles.value}>{formatDate(show.date)}</span>

        <span className={styles.label}>Multiple Shows</span>
        <span className={styles.value}>{show.isMulti ? "Yes" : "No"}</span>

        <span className={styles.label}>Unparsed</span>
        <span className={styles.value}>{show.unparsed ? "Yes" : "No"}</span>

        <span className={styles.label}>Show in Build Roster</span>
        <span className={styles.value}>
          <Switch.Root
            className={styles.switchRoot}
            checked={show.build?.shouldShowInRoster === true}
            onCheckedChange={(checked) => setField("build.shouldShowInRoster", checked)}
          >
            <Switch.Thumb className={styles.switchThumb} />
          </Switch.Root>
        </span>
      </div>
    </section>
  );
}
