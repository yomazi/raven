// client/src/components/Content/shared/ContractsPanel/contractTermsFields.js
//
// Shared field definitions for a contract's terms/payment/production —
// used by both ParseContractModal (parsed-vs-current review) and
// ContractTermsModal (direct inspect/edit), so the two stay in sync with
// each other and with the Contract schema (server/models/Show.js).

export const BACKEND_TYPES = ["none", "plus", "vs"];
export const MERCH_CUTS = ["no merch commission", "85% artist / 15% venue"];

export const FIELD_SECTIONS = [
  {
    title: "Main Terms",
    path: ["terms", "main"],
    fields: [
      { key: "guarantee", label: "Guarantee", type: "currency" },
      { key: "backendType", label: "Backend Type", type: "enum", options: BACKEND_TYPES, default: "none" },
      { key: "percentage", label: "Percentage", type: "percent" },
      { key: "splitPoint", label: "Split Point", type: "currency" },
    ],
  },
  {
    title: "Livestream",
    path: ["terms", "livestream"],
    fields: [
      { key: "hasLivestream", label: "Has Livestream", type: "boolean" },
      { key: "ticketPrice", label: "Ticket Price", type: "currency" },
      { key: "guarantee", label: "Guarantee", type: "currency" },
      { key: "backendType", label: "Backend Type", type: "enum", options: BACKEND_TYPES, default: "none" },
      { key: "percentage", label: "Percentage", type: "percent" },
      { key: "splitPoint", label: "Split Point", type: "currency" },
    ],
    // The checkbox always shows. Everything else — Ticket Price, then a row
    // mirroring Main Terms exactly (guarantee, backendType, percentage,
    // splitPoint) — lives in an animated collapse, expanded only once
    // livestream is (or was just parsed as) true. Most contracts have no
    // livestream, so this keeps the tile down to one line by default.
    alwaysVisibleKeys: ["hasLivestream"],
    collapsibleRows: [["ticketPrice"], ["guarantee", "backendType", "percentage", "splitPoint"]],
    showFieldsWhenTrue: "hasLivestream",
  },
  {
    title: "Deposit Payment",
    path: ["payment", "deposit"],
    fields: [
      { key: "hasDeposit", label: "Has Deposit", type: "boolean" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "payee", label: "Payee" },
      { key: "method", label: "Method" },
    ],
    // Not every contract has a deposit — same pattern as Livestream.
    alwaysVisibleKeys: ["hasDeposit"],
    collapsibleRows: [["dueDate", "amount", "payee", "method"]],
    showFieldsWhenTrue: "hasDeposit",
  },
  {
    title: "Balance Payment",
    path: ["payment", "balance"],
    fields: [
      { key: "payee", label: "Payee" },
      { key: "method", label: "Method" },
    ],
  },
  {
    title: "Other",
    path: ["production"],
    fields: [
      { key: "merchCut", label: "Merch Cut", type: "enum", options: MERCH_CUTS, default: "no merch commission" },
      { key: "numGuestListComps", label: "Guest List Comps" },
    ],
  },
];

export function getAtPath(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj) ?? {};
}

export function setAtPath(obj, path, key, value) {
  const next = structuredClone(obj);
  const target = path.reduce((acc, p) => {
    if (acc[p] === undefined || acc[p] === null) acc[p] = {};
    return acc[p];
  }, next);
  target[key] = value;
  return next;
}

// Picks just this section's fields out of `data` (extracted parse fields or
// an edit draft), defaulting anything missing to null.
export function pickSectionValues(section, data) {
  const parsed = getAtPath(data, section.path);
  const values = {};
  section.fields.forEach((f) => {
    values[f.key] = parsed?.[f.key] ?? null;
  });
  return values;
}
