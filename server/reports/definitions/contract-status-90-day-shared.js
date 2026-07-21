import { CONTRACT_STATUS } from "../../../shared/constants/builds.js";

const rgb = (r, g, b) => ({ red: r / 255, green: g / 255, blue: b / 255 });

// Every CONTRACT_STATUS value needs an entry — this doubles as both the
// live report's per-write background color and its conditional-format rules
// (see dropdownColors below), so a status without a color here would render
// with no fill in either case.
export const CONTRACT_STATUS_COLORS = {
  FEC: rgb(182, 215, 168),
  blocked: rgb(234, 153, 153),
  "waiting for them": rgb(255, 229, 153),
  "waiting for us": rgb(234, 153, 153),
  // Same red as "waiting for us" — treated as an internal bottleneck (the
  // ball's in our own org's court), not an external one. Flag if you'd
  // rather this read differently.
  "waiting for exec": rgb(234, 153, 153),
  "drafted by us": rgb(207, 226, 255),
  "drafted by them": rgb(207, 226, 255),
  "in progress": rgb(255, 229, 153),
  "to do": rgb(217, 217, 217), // grey — untouched
  "n/a": rgb(217, 217, 217),
};

export const CONTRACT_STATUS_HEADER_STYLE = {
  background: rgb(243, 243, 243),
  bold: true,
  align: "CENTER",
};

// One row per active contract (not per show) — a show with several
// contracts contributes several rows, and a show with none contributes none.
export function contractStatus90DayFilter(shows) {
  // Normalize to the start of today — otherwise a show dated at midnight
  // today fails `s.date >= now` the moment any time has passed today.
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in90Days = new Date(now);
  in90Days.setDate(in90Days.getDate() + 90);
  return shows
    .filter((s) => s.build?.shouldShowInRoster && s.date >= now && s.date <= in90Days)
    .flatMap((show) =>
      (show.build?.contracts ?? [])
        .filter((c) => !c.archived)
        .map((contract) => ({ ...show, _contract: contract }))
    );
}

// The four Raven-owned columns for the live contract-status-90-day report.
// headerAlign is currently only honored by the live report engine. All four
// are `protect: true` (see ensureColumnProtections in live-report.service.js):
// Raven is the sole source of truth for identity/status, so none of them
// should be editable directly in Sheets. "Robin's notes" is NOT here — it's
// defined directly in contract-status-90-day-live.js, added on top of these.
export const contractStatus90DayColumns = [
  {
    header: "Date",
    key: "date",
    dateFormat: "dddd, MMMM D, YYYY",
    align: "RIGHT",
    headerAlign: "RIGHT",
    autoWidth: true,
    autoWidthPadding: 16,
    protect: true,
  },
  {
    header: "Artist",
    value: (show) => show.artist,
    hyperlink: (show) =>
      show.googleFolderId
        ? `https://drive.google.com/drive/folders/${show.googleFolderId}`
        : null,
    align: "LEFT",
    headerAlign: "LEFT",
    autoWidth: true,
    autoWidthPadding: 24,
    protect: true,
  },
  {
    header: "Contract Signee",
    value: (show) => show._contract.signee,
    hyperlink: (show) =>
      show._contract.folderId
        ? `https://drive.google.com/drive/folders/${show._contract.folderId}`
        : null,
    align: "LEFT",
    headerAlign: "LEFT",
    autoWidth: true,
    autoWidthPadding: 24,
    protect: true,
  },
  {
    header: "Status",
    value: (show) => show._contract.status,
    align: "CENTER",
    width: 130,
    background: (show) => CONTRACT_STATUS_COLORS[show._contract.status] ?? null,
    dropdown: CONTRACT_STATUS,
    // Live report only: turns into conditional-format rules (see
    // ensureConditionalFormatting in live-report.service.js) so the color
    // follows the dropdown selection even without Raven involved.
    dropdownColors: CONTRACT_STATUS_COLORS,
    protect: true,
  },
];
