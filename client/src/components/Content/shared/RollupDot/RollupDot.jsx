import { ROLLUP_STATUS } from "@shared/constants/builds.js";
import styles from "./RollupDot.module.css";

const STATUS_MAP = {
  [ROLLUP_STATUS.NOT_STARTED]: "to_do",
  [ROLLUP_STATUS.IN_PROGRESS]: "in_progress",
  [ROLLUP_STATUS.BLOCKED]: "blocked",
  [ROLLUP_STATUS.DONE]: "done",
  [ROLLUP_STATUS.NA]: "done",
};

const RollupDot = ({ value, phase }) => {
  if (!value) return null;
  const status = STATUS_MAP[value] ?? "to_do";
  const label = `${phase} status: ${value === ROLLUP_STATUS.NA ? "done" : value}`;

  return <div className={styles.rollupDot} data-status={status} title={label} />;
};

export default RollupDot;
