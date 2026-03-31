import { PRIORITY_LABEL, STATUS_LABEL, TASK_PRIORITY, TASK_STATUS } from "@hooks/useTasks";
import useRavenStore from "@store/useRavenStore";
import styles from "./TasksFilter.module.css";

export default function TasksFilter() {
  const {
    filterStatus,
    filterPriority,
    filterLinked,
    toggleFilterStatus,
    toggleFilterPriority,
    setFilterLinked,
    clearTaskFilters,
  } = useRavenStore();

  const hasFilters = filterStatus.length > 0 || filterPriority.length > 0 || filterLinked !== "all";

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.heading}>Filters</span>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearTaskFilters}>
            Clear all
          </button>
        )}
      </div>

      {/* ── Task type */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Tasks</div>
        {[
          { value: "all", label: "All tasks" },
          { value: "linked", label: "Show-linked" },
          { value: "general", label: "General" },
        ].map(({ value, label }) => (
          <button
            key={value}
            className={styles.radioBtn}
            data-active={filterLinked === value || undefined}
            onClick={() => setFilterLinked(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {/* ── Status */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Status</div>
        {TASK_STATUS.map((s) => (
          <button
            key={s}
            className={styles.checkBtn}
            data-active={filterStatus.includes(s) || undefined}
            onClick={() => toggleFilterStatus(s)}
          >
            <span className={styles.check}>{filterStatus.includes(s) ? "✓" : ""}</span>
            <span className={`${styles.badgeLabel} ${styles[`status--${s}`]}`}>
              {STATUS_LABEL[s]}
            </span>
          </button>
        ))}
      </section>

      {/* ── Priority */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Priority</div>
        {TASK_PRIORITY.map((p) => (
          <button
            key={p}
            className={styles.checkBtn}
            data-active={filterPriority.includes(p) || undefined}
            onClick={() => toggleFilterPriority(p)}
          >
            <span className={styles.check}>{filterPriority.includes(p) ? "✓" : ""}</span>
            <span className={`${styles.badgeLabel} ${styles[`priority--${p}`]}`}>
              {PRIORITY_LABEL[p]}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
