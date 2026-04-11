/**
 * Gmail_config.js
 *
 * Single source of truth for:
 *   - Teams, doctypes, and naming rules
 *   - Team email rosters
 *   - Label routing rules (which Gmail labels to apply based on document type)
 *
 * ─── Stage behaviour keys ──────────────────────────────────────────────────────
 *
 *   "none"               No stage, no number. {team}.{doctype} - {filename}
 *   "numbered"           No stage, occurrence-counted. {team}.{doctype}.{n} - {filename}
 *   "draft"              Versioned draft only. {team}.{doctype}.draft.{n} - {filename}
 *   "draft+FEC"          draft.{n} → FEC → FEC.update.{n}
 *   "draft+REDLINED"     draft.{n} → REDLINED → REDLINED.update.{n}
 */

// ─── Teams ────────────────────────────────────────────────────────────────────

export const TEAMS = [
  { code: "prg", label: "Programming" },
  { code: "prod", label: "Production" },
  { code: "fin", label: "Finance" },
  { code: "mkt", label: "Marketing" },
  { code: "bxo", label: "Box Office" },
  // Add new teams here:
  // { code: "ops", label: "Operations" },
];

// ─── Team rosters ─────────────────────────────────────────────────────────────
// Used to populate the To: field when routing uploaded documents to internal teams.
// Add or remove addresses here as staff changes.

export const TEAM_ROSTERS = {
  fin: [
    "rgabrielli@thefreight.org",
    // "finance1@thefreight.org",
    // "finance2@thefreight.org",
  ],
  prod: [
    "rgabrielli@thefreight.org",
    // "production1@thefreight.org",
    // "production2@thefreight.org",
  ],
  mkt: [
    "rgabrielli@thefreight.org",
    // "marketing1@thefreight.org",
  ],
  bxo: [
    "rgabrielli@thefreight.org",
    // "boxoffice@thefreight.org",
  ],
  // prg has no roster — programming documents are handled by you alone,
  // except contracts which route to fin (see LABEL_RULES below).
};

// ─── Send-as aliases ──────────────────────────────────────────────────────────
// Must be verified aliases in Gmail Settings → Accounts → Send mail as.

export const SEND_AS_ALIASES = [
  { address: "rgabrielli@thefreight.org", label: "My account (default)", name: "Robin Gabrielli" },
  { address: "programming@thefreight.org", label: "Programming", name: "The Freight" },
];

// ─── Gmail label names ────────────────────────────────────────────────────────
// These must match label names exactly as they exist in your Gmail account.
// Create them in Gmail first (Settings → Labels), then reference them here.

export const GMAIL_LABELS = {
  ARTIST: "Artist",
  FIN: "FIN",
  PROD: "PROD",
  CONTRACTS: "Contracts",
  OFFERS: "Offers",
  FINANCE_DOCS: "Finance Docs",
  RIDERS_AND_PROD_DOCS: "Riders & Production Docs",
};

// ─── Label routing rules ──────────────────────────────────────────────────────
//
// Keyed by a prefix matcher — a string that the uploaded filename must START WITH
// (after lowercasing) to match this rule.
//
// Each rule defines:
//   toTeams          string[]   Team codes whose rosters populate the To: field.
//                               Empty array = no outgoing team email.
//   receivedLabels   string[]   Labels applied to the entire received thread.
//                               Always includes "Artist" for inbound artist mail.
//   sentLabels       string[]   Labels applied to the sent message.
//
// Rules are evaluated in order — first match wins. More specific prefixes
// (e.g. "prg.contract") should come before broader ones (e.g. "prg").

export const LABEL_RULES = [
  {
    prefix: "prg.contract",
    toTeams: ["fin"],
    receivedLabels: [GMAIL_LABELS.ARTIST, GMAIL_LABELS.CONTRACTS],
    sentLabels: [GMAIL_LABELS.FIN, GMAIL_LABELS.CONTRACTS],
  },
  {
    prefix: "prg.offer",
    toTeams: [],
    receivedLabels: [GMAIL_LABELS.ARTIST, GMAIL_LABELS.OFFERS],
    sentLabels: [GMAIL_LABELS.OFFERS],
  },
  {
    prefix: "prod.rider",
    toTeams: ["prod"],
    receivedLabels: [GMAIL_LABELS.ARTIST, GMAIL_LABELS.RIDERS_AND_PROD_DOCS],
    sentLabels: [GMAIL_LABELS.PROD, GMAIL_LABELS.RIDERS_AND_PROD_DOCS],
  },
  {
    prefix: "prod",
    toTeams: ["prod"],
    receivedLabels: [GMAIL_LABELS.ARTIST, GMAIL_LABELS.RIDERS_AND_PROD_DOCS],
    sentLabels: [GMAIL_LABELS.PROD, GMAIL_LABELS.RIDERS_AND_PROD_DOCS],
  },
  {
    prefix: "fin",
    toTeams: ["fin"],
    receivedLabels: [GMAIL_LABELS.ARTIST, GMAIL_LABELS.FINANCE_DOCS],
    sentLabels: [GMAIL_LABELS.FIN, GMAIL_LABELS.FINANCE_DOCS],
  },
];

// ─── Doctype definitions ───────────────────────────────────────────────────────

export const DOCTYPES = {
  prg: [
    { key: "contract", label: "Contract", stages: "draft+FEC" },
    { key: "offer", label: "Offer", stages: "draft" },
  ],
  prod: [
    {
      key: "rider",
      label: "Rider",
      stages: "draft+REDLINED",
      subtypes: { known: ["hospitality", "tech"], custom: true },
    },
    { key: "stage-plot", label: "Stage Plot", stages: "draft" },
    { key: "input-list", label: "Input List", stages: "draft" },
  ],
  fin: [
    { key: "w9", label: "W9", stages: "none" },
    { key: "w8ben", label: "W8-BEN", stages: "none" },
    {
      key: "payment",
      label: "Payment Confirmation",
      stages: "numbered",
      paymentTypes: { known: ["deposit", "balance", "back-end"], custom: true },
    },
  ],
  mkt: [],
  bxo: [],
};

// ─── Naming helpers ───────────────────────────────────────────────────────────

/**
 * Given the UI selections, build the full filename prefix.
 *
 * @param {object} opts
 *   team, doctype, subtype, paymentType, stage, version
 * @returns string  e.g. "prod.rider.hospitality.draft.3"
 */
export function buildPrefix({ team, doctype, subtype, paymentType, stage, version }) {
  const parts = [team, doctype];

  if (subtype) parts.push(subtype);
  if (paymentType) parts.push(paymentType);

  const isTerminal = stage === "FEC" || stage === "REDLINED";
  const isVersioned = stage !== "" && !isTerminal;

  if (stage) parts.push(stage);
  if (isVersioned && version) parts.push(String(version));

  return parts.join(".");
}

/**
 * Scan existing filenames and return the next version/occurrence number
 * for a given prefix. Returns 1 if no existing files match.
 *
 * @param {string[]} existingFilenames
 * @param {string}   prefix   e.g. "prod.rider.hospitality.draft"
 * @returns number
 */
export function computeNextVersion(existingFilenames, prefix) {
  const pattern = new RegExp(`^${escapeRegex(prefix)}\\.(\\d+)`, "i");
  let max = 0;
  for (const name of existingFilenames) {
    const m = name.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Return the stage options for a given doctype config entry.
 * @returns { value, label, versioned }[]
 */
export function getStageOptions(doctypeConfig) {
  if (!doctypeConfig) return [];
  switch (doctypeConfig.stages) {
    case "none":
    case "numbered":
      return [];
    case "draft":
      return [{ value: "draft", label: "Draft", versioned: true }];
    case "draft+FEC":
      return [
        { value: "draft", label: "Draft", versioned: true },
        { value: "FEC", label: "FEC", versioned: false },
        { value: "FEC.update", label: "FEC Update", versioned: true },
      ];
    case "draft+REDLINED":
      return [
        { value: "draft", label: "Draft", versioned: true },
        { value: "REDLINED", label: "Redlined", versioned: false },
        { value: "REDLINED.update", label: "Redlined Update", versioned: true },
      ];
    default:
      return [];
  }
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Given a list of uploaded filenames, derive the combined routing for a send action.
 *
 * Walks all uploaded filenames, finds matching LABEL_RULES, and merges the results:
 *   - toAddresses:     deduplicated email addresses from all matched team rosters
 *   - receivedLabels:  deduplicated labels to apply to the received thread
 *   - sentLabels:      deduplicated labels to apply to the sent message
 *
 * @param {string[]} uploadedFilenames  e.g. ["prod.rider.hospitality.draft.1 - TechRider.pdf"]
 * @returns {{ toAddresses: string[], receivedLabels: string[], sentLabels: string[] }}
 */
export function deriveRouting(uploadedFilenames) {
  const toTeams = new Set();
  const receivedLabels = new Set();
  const sentLabels = new Set();

  for (const filename of uploadedFilenames) {
    const lower = filename.toLowerCase();
    const rule = LABEL_RULES.find((r) => lower.startsWith(r.prefix.toLowerCase()));
    if (!rule) continue;

    rule.toTeams.forEach((t) => toTeams.add(t));
    rule.receivedLabels.forEach((l) => receivedLabels.add(l));
    rule.sentLabels.forEach((l) => sentLabels.add(l));
  }

  const toAddresses = [...toTeams]
    .flatMap((team) => TEAM_ROSTERS[team] ?? [])
    .filter((addr, i, arr) => arr.indexOf(addr) === i); // dedupe

  return {
    toAddresses,
    receivedLabels: [...receivedLabels],
    sentLabels: [...sentLabels],
  };
}
