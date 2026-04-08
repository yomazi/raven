// server/shows/build.utils.js
// Server-only utilities for build roster logic.
// Not imported by the client.

import {
  BUILD_FIELDS,
  CLOSE_FIELDS,
  ROLLUP_STATUS,
  SETUP_FIELDS,
} from "../../shared/constants/builds.js";

// ---------------------------------------------------------------------------
// CONTRACT_STATUS_DATE_MAP
// Maps contract status values to the date field they should auto-populate.
// ---------------------------------------------------------------------------

export const CONTRACT_STATUS_DATE_MAP = {
  "drafted by us": "dateDrafted",
  "drafted by them": "dateDrafted",
  "waiting for them": "dateSigned",
  "waiting for Par": "dateSigned",
  done: "dateFEC",
};

// ---------------------------------------------------------------------------
// flatten
// Converts a nested object to dot-notation key/value pairs.
// Used to prepare patches for MongoDB $set operations.
// ---------------------------------------------------------------------------

export function flatten(obj, prefix = "", result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      flatten(value, path, result);
    } else {
      result[path] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// deriveRollup
// Derives the rollup status for a phase given an array of field values.
//
// Priority order: blocked > done > in progress > not started > n/a
// ---------------------------------------------------------------------------

export function deriveRollup(values) {
  if (values.length === 0) return ROLLUP_STATUS.NA;

  const active = values.filter((v) => v !== "n/a");
  if (active.length === 0) return ROLLUP_STATUS.NA;
  if (active.some((v) => v === "blocked")) return ROLLUP_STATUS.BLOCKED;
  if (active.every((v) => v === "done")) return ROLLUP_STATUS.DONE;
  if (active.some((v) => v === "in progress")) return ROLLUP_STATUS.IN_PROGRESS;
  if (active.every((v) => v === "to do")) return ROLLUP_STATUS.NOT_STARTED;

  // Mixed: some done, some to do, none blocked or in progress
  return ROLLUP_STATUS.IN_PROGRESS;
}

// ---------------------------------------------------------------------------
// deriveAllRollups
// Derives all three phase rollups from a build subdocument.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// findTriggeringField
// Returns the first field in a phase that changed between two build states.
// ---------------------------------------------------------------------------

function findTriggeringField(fields, currentBuild, previousBuild) {
  return fields.find((f) => (currentBuild[f] ?? "n/a") !== (previousBuild[f] ?? "n/a")) ?? null;
}

// ---------------------------------------------------------------------------
// processBuildSideEffects
// Called before the patch is written, against already-flattened updates.
// Returns extra fields to merge into the update payload, and pre-patch events.
// ---------------------------------------------------------------------------

export function processBuildSideEffects(flatUpdates, currentBuild) {
  const extra = {};
  const events = [];
  const now = new Date();

  // -- dateConfirmed ----------------------------------------------------------
  // Auto-set when showFolder first leaves 'to do'.
  if (
    flatUpdates["build.showFolder"] &&
    flatUpdates["build.showFolder"] !== "to do" &&
    !currentBuild.dateConfirmed
  ) {
    extra["build.dateConfirmed"] = now;
  }

  // -- contract date auto-population ------------------------------------------
  if (flatUpdates["build.contract"]) {
    const newStatus = flatUpdates["build.contract"];
    const oldStatus = currentBuild.contract;
    const dateField = CONTRACT_STATUS_DATE_MAP[newStatus];

    if (dateField) {
      extra[`build.${dateField}`] = now;
    }

    if (newStatus !== oldStatus) {
      events.push({
        type: "contract_status_changed",
        date: now,
        from: oldStatus ?? null,
        to: newStatus,
      });
    }
  }

  // -- sis_released event -----------------------------------------------------
  if (flatUpdates["build.sisReleased"] === "done" && currentBuild.sisReleased !== "done") {
    events.push({
      type: "sis_released",
      date: now,
    });
  }

  // -- roster_changed event ---------------------------------------------------
  if (
    typeof flatUpdates["build.shouldShowInRoster"] === "boolean" &&
    flatUpdates["build.shouldShowInRoster"] !== currentBuild.shouldShowInRoster
  ) {
    events.push({
      type: "roster_changed",
      date: now,
      value: flatUpdates["build.shouldShowInRoster"],
    });
  }

  return { extra, events };
}

// ---------------------------------------------------------------------------
// processPhaseCompletions
// Called after the patch is written. Compares old and new build state,
// stamps or clears phase completion dates, and logs phase events.
// ---------------------------------------------------------------------------

export function processPhaseCompletions(updatedBuild, previousBuild) {
  const now = new Date();
  const extra = {};
  const events = [];

  const phases = [
    { name: "setup", fields: SETUP_FIELDS, dateField: "build.dateSetupComplete" },
    { name: "build", fields: BUILD_FIELDS, dateField: "build.dateBuildComplete" },
    { name: "close", fields: CLOSE_FIELDS, dateField: "build.dateCloseComplete" },
  ];

  for (const { name, fields, dateField } of phases) {
    const currentValues = fields.map((f) => updatedBuild[f] ?? "n/a");
    const previousValues = fields.map((f) => previousBuild[f] ?? "n/a");

    const isDone = deriveRollup(currentValues) === ROLLUP_STATUS.DONE;
    const wasDone = deriveRollup(previousValues) === ROLLUP_STATUS.DONE;

    if (isDone && !wasDone) {
      extra[dateField] = now;
      events.push({
        type: "phase_completed",
        date: now,
        phase: name,
        triggeredBy: findTriggeringField(fields, updatedBuild, previousBuild),
      });
    } else if (!isDone && wasDone) {
      const previousCompletionDate = previousBuild[dateField.replace("build.", "")] ?? null;
      extra[dateField] = null;
      events.push({
        type: "phase_reopened",
        date: now,
        phase: name,
        triggeredBy: findTriggeringField(fields, updatedBuild, previousBuild),
        previousCompletionDate,
      });
    }
  }

  return { extra, events };
}
