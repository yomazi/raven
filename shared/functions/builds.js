// shared/functions/buildRollup.js

import { BUILD_FIELDS, CLOSE_FIELDS, ROLLUP_STATUS, SETUP_FIELDS } from "../constants/builds.js";

export function deriveRollup(values) {
  if (values.length === 0) return ROLLUP_STATUS.NA;
  const active = values.filter((v) => v !== "n/a");
  if (active.length === 0) return ROLLUP_STATUS.NA;
  if (active.some((v) => v === "blocked")) return ROLLUP_STATUS.BLOCKED;
  if (active.every((v) => v === "done")) return ROLLUP_STATUS.DONE;
  if (active.some((v) => v === "in progress")) return ROLLUP_STATUS.IN_PROGRESS;
  if (active.every((v) => v === "to do")) return ROLLUP_STATUS.NOT_STARTED;
  return ROLLUP_STATUS.IN_PROGRESS;
}

export function deriveAllRollups(build) {
  if (!build)
    return {
      setup: ROLLUP_STATUS.NA,
      build: ROLLUP_STATUS.NA,
      close: ROLLUP_STATUS.NA,
    };
  return {
    setup: deriveRollup(SETUP_FIELDS.map((f) => build[f] ?? "n/a")),
    build: deriveRollup(BUILD_FIELDS.map((f) => build[f] ?? "n/a")),
    close: deriveRollup(CLOSE_FIELDS.map((f) => build[f] ?? "n/a")),
  };
}
