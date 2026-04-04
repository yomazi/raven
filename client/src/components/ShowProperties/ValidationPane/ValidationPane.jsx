import SvgSave from "@svg/save_google.svg?react";
import styles from "./ValidationPane.module.css";

export default function ValidationPane({ warnings, onSave, isPending, isDirty, scrollToSection }) {
  const hasWarnings = warnings.length > 0;

  return (
    <div className={styles.pane} data-dirty={isDirty}>
      <div className={styles.toolbar}>
        <div className={styles.warningCount}>
          {hasWarnings && `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`}
        </div>
        {isDirty && <div className={styles.unsavedChanges}>unsaved changes</div>}
        <div className={styles.toolbarRight}>
          <div className={styles.tooltip}>(CTRL+S or click)</div>
          <button
            className={styles.saveButton}
            onClick={onSave}
            disabled={isPending}
            data-saving={isPending}
          >
            <SvgSave />
            Save
          </button>
        </div>
      </div>
      {hasWarnings && (
        <ul className={styles.list} data-saving={isPending}>
          {warnings.map((w) => (
            <li
              key={w.code}
              className={styles.warning}
              onClick={() => scrollToSection(w.sectionAnchor)}
            >
              <span className={styles.sectionAnchor}>{w.sectionAnchor}</span>:&nbsp;
              <span className={styles.message}>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
