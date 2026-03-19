/**
 * DRAGONFLY_CONFIG.js
 *
 * Single source of truth for teams, doctypes, and naming rules.
 * Add new teams or doctypes here — no component code changes needed.
 *
 * ─── Stage behaviour keys ──────────────────────────────────────────────────────
 *
 *   "none"       No stage, no number. Pattern: {team}.{doctype} - {filename}
 *                e.g. fin.w9 - W9_Form.pdf
 *
 *   "numbered"   No stage label, but occurrence-counted. Pattern: {team}.{doctype}.{n} - {filename}
 *                Scan folder for {team}.{doctype}.* to find max n.
 *                e.g. fin.payment.deposit.2 - ACH_Confirmation.pdf
 *
 *   "draft"      Versioned draft only, no terminal stage.
 *                Pattern: {team}.{doctype}.draft.{n} - {filename}
 *                e.g. prod.stage-plot.draft.3 - StageMap.pdf
 *
 *   "draft+FEC"  Draft → FEC (terminal) → FEC.update (versioned).
 *                Stages: draft.{n} | FEC | FEC.update.{n}
 *                e.g. prg.contract.FEC - Agreement.pdf
 *
 *   "draft+REDLINED"  Draft → REDLINED (terminal) → REDLINED.update (versioned).
 *                     Stages: draft.{n} | REDLINED | REDLINED.update.{n}
 *                     e.g. prod.rider.hospitality.REDLINED - TechRider.pdf
 */

export const TEAMS = [
  { code: "prg",  label: "Programming" },
  { code: "prod", label: "Production" },
  { code: "fin",  label: "Finance" },
  { code: "mkt",  label: "Marketing" },
  { code: "bxo",  label: "Box Office" },
  // Add new teams here:
  // { code: "ops", label: "Operations" },
];

/**
 * DOCTYPE definitions per team.
 *
 * Each entry:
 *   key         string   — the segment used in the filename (may contain dots, e.g. "payment.deposit")
 *   label       string   — human-readable label shown in the UI dropdown
 *   stages      string   — one of the stage behaviour keys above
 *   subtypes?   object   — present when the doctype has a variable sub-segment
 *                          { segment: "which part is the subtype", known: [...], custom: bool }
 *   paymentTypes? string[] — present for payment doctypes; list of known payment type codes
 */
export const DOCTYPES = {
  prg: [
    {
      key: "contract",
      label: "Contract",
      stages: "draft+FEC",
    },
    {
      key: "offer",
      label: "Offer",
      stages: "draft",
    },
    // Add new prg doctypes here
  ],

  prod: [
    {
      key: "rider",
      label: "Rider",
      stages: "draft+REDLINED",
      // Subtype sits between "rider" and the stage: prod.rider.hospitality.draft.1
      subtypes: {
        known: ["hospitality", "tech"],
        custom: true,
      },
    },
    {
      key: "stage-plot",
      label: "Stage Plot",
      stages: "draft",
    },
    {
      key: "input-list",
      label: "Input List",
      stages: "draft",
    },
    // Add new prod doctypes here
  ],

  fin: [
    {
      key: "w9",
      label: "W9",
      stages: "none",
    },
    {
      key: "w8ben",
      label: "W8-BEN",
      stages: "none",
    },
    {
      key: "payment",
      label: "Payment Confirmation",
      stages: "numbered",
      // Payment type is a sub-segment: fin.payment.deposit.2
      paymentTypes: {
        known: ["deposit", "balance", "back-end"],
        custom: true,
      },
    },
    // Add new fin doctypes here
  ],

  mkt: [
    // Add mkt doctypes here; all default to "draft" unless specified
  ],

  bxo: [
    // Add bxo doctypes here; all default to "draft" unless specified
  ],
};

/**
 * Given the UI selections, build the full filename prefix (everything before " - {original}").
 *
 * @param {object} opts
 *   team        string  — team code e.g. "prg"
 *   doctype     string  — doctype key e.g. "contract"
 *   subtype     string  — rider subtype e.g. "hospitality" (or "" if none)
 *   paymentType string  — payment type e.g. "deposit" (or "" if none)
 *   stage       string  — selected stage e.g. "draft" | "FEC" | "REDLINED" | "FEC.update" | "REDLINED.update" | ""
 *   version     number  — computed or user-supplied version number (ignored when stage is terminal or "none")
 *
 * @returns string  — prefix, e.g. "prod.rider.hospitality.draft.3"
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
 * Given an existing list of filenames in the Drive folder, compute the next
 * version/occurrence number for a given prefix.
 *
 * Scans for files whose name starts with `prefix.` (followed by a digit),
 * extracts all trailing version numbers, and returns max + 1. Returns 1 if none found.
 *
 * @param {string[]} existingFilenames  — list of filenames already in the folder
 * @param {string}   prefix             — e.g. "prod.rider.hospitality.draft"
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
 * Derive the stages available for a doctype config entry.
 * Returns an array of { value, label, versioned } objects for the stage selector.
 */
export function getStageOptions(doctypeConfig) {
  if (!doctypeConfig) return [];
  switch (doctypeConfig.stages) {
    case "none":
      return [];
    case "numbered":
      return [];
    case "draft":
      return [
        { value: "draft", label: "Draft", versioned: true },
      ];
    case "draft+FEC":
      return [
        { value: "draft",      label: "Draft",      versioned: true  },
        { value: "FEC",        label: "FEC",         versioned: false },
        { value: "FEC.update", label: "FEC Update",  versioned: true  },
      ];
    case "draft+REDLINED":
      return [
        { value: "draft",             label: "Draft",            versioned: true  },
        { value: "REDLINED",          label: "Redlined",         versioned: false },
        { value: "REDLINED.update",   label: "Redlined Update",  versioned: true  },
      ];
    default:
      return [];
  }
}
