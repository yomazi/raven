// Enums and field group arrays for the build roster.
// Imported by both client and server.

// ---------------------------------------------------------------------------
// Base status — shared by most build fields
// ---------------------------------------------------------------------------

export const BASE_STATUS = ["n/a", "to do", "in progress", "blocked", "done"];

// ---------------------------------------------------------------------------
// Field-specific enums
// ---------------------------------------------------------------------------

export const CONTRACT_STATUS = [
  "n/a",
  "to do",
  "drafted by us",
  "drafted by them",
  "waiting for them",
  "waiting for Par",
  "blocked",
  "done",
];

export const MARKETING_ASSETS_STATUS = [...BASE_STATUS, "packet sent"];

// ---------------------------------------------------------------------------
// Field → phase mapping
// Used by the UI to group fields into sections, and by the server for rollup
// computation and phase completion logic.
// ---------------------------------------------------------------------------

export const SETUP_FIELDS = [
  "showFolder",
  "calendarUpdated",
  "bookingSpreadsheet",
  "offerInFolder",
  "packetSent",
  "sisPopulated",
];

export const BUILD_FIELDS = ["tessitura", "tnew", "marketingAssetsCompiled", "sisReleased"];

export const CLOSE_FIELDS = ["contract", "livestream", "workbook"];

// ---------------------------------------------------------------------------
// Rollup status values
// Defined here so the client can reference them for badge rendering
// without importing server-only utilities.
// ---------------------------------------------------------------------------

export const ROLLUP_STATUS = {
  NA: "n/a",
  NOT_STARTED: "not started",
  IN_PROGRESS: "in progress",
  BLOCKED: "blocked",
  DONE: "done",
};
