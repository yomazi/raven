/**
 * Production Status Report
 *
 * One row per show, showing all build-phase statuses with dropdown validation,
 * the show date, and a hyperlink to the Google Drive folder.
 *
 * Configure FOLDER_ID to the Drive folder where these reports should live.
 */


// Drive folder ID that will hold generated reports. Change to match your setup.
const FOLDER_ID = process.env.REPORTS_FOLDER_DEV_ID ?? "REPLACE_WITH_DRIVE_FOLDER_ID";

// Color helpers
const rgb = (r, g, b) => ({ red: r / 255, green: g / 255, blue: b / 255 });

const STATUS_COLORS = {
  done: rgb(182, 215, 168), // soft green
  blocked: rgb(234, 153, 153), // soft red
  "in progress": rgb(255, 229, 153), // soft yellow
  "to do": rgb(217, 217, 217), // grey — untouched
  "n/a": rgb(255, 255, 255), // white — not applicable
  "waiting for them": rgb(255, 229, 153),
  "waiting for us": rgb(234, 153, 153),
  "drafted by us": rgb(207, 226, 255),
  "drafted by them": rgb(207, 226, 255),
};

function statusBackground(key) {
  return (show) => STATUS_COLORS[show?.build?.[key]] ?? null;
}


function driveUrl(show) {
  return show.googleFolderId
    ? `https://drive.google.com/drive/folders/${show.googleFolderId}`
    : null;
}

const productionStatusReport = {
  name: "production-status",

  folderId: FOLDER_ID,

  title: (now) => {
    const stamp = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return `Production Status – ${stamp}`;
  },

  // Only include shows that appear on the roster, sorted by date ascending.
  filter: { "build.shouldShowInRoster": true },
  sort: { date: 1 },

  frozenRows: 1,
  headerStyle: {
    background: rgb(243, 243, 243),
    bold: true,
    align: "CENTER",
  },

  columns: [
    {
      header: "Date",
      key: "date",
      dateFormat: "dddd, MMMM D, YYYY",
      align: "RIGHT",
      autoWidth: true,
      autoWidthPadding: 16,
    },
    {
      header: "Artist",
      value: (show) => show.artist,
      hyperlink: driveUrl,
      align: "LEFT",
      autoWidth: true,
      autoWidthPadding: 24,
    },
    {
      header: "Show Folder",
      key: "build.showFolder",
      align: "CENTER",
      width: 100,
      background: statusBackground("showFolder"),
    },
    {
      header: "Calendar",
      key: "build.calendarUpdated",
      align: "CENTER",
      width: 100,
      background: statusBackground("calendarUpdated"),
    },
    {
      header: "Booking Sheet",
      key: "build.bookingSpreadsheet",
      align: "CENTER",
      width: 110,
      background: statusBackground("bookingSpreadsheet"),
    },
    {
      header: "Offer In Folder",
      key: "build.offerInFolder",
      align: "CENTER",
      width: 110,
      background: statusBackground("offerInFolder"),
    },
    {
      header: "Packet Sent",
      key: "build.packetSent",
      align: "CENTER",
      width: 110,
      background: statusBackground("packetSent"),
    },
    {
      header: "SIS",
      key: "build.sisPopulated",
      align: "CENTER",
      width: 80,
      background: statusBackground("sisPopulated"),
    },
    {
      header: "Tessitura",
      key: "build.tessitura",
      align: "CENTER",
      width: 100,
      background: statusBackground("tessitura"),
    },
    {
      header: "TNEW",
      key: "build.tnew",
      align: "CENTER",
      width: 80,
      background: statusBackground("tnew"),
    },
    {
      header: "Mktg Assets",
      key: "build.marketingAssetsCompiled",
      align: "CENTER",
      width: 110,
      background: statusBackground("marketingAssetsCompiled"),
    },
    {
      header: "SIS Released",
      key: "build.sisReleased",
      align: "CENTER",
      width: 100,
      background: statusBackground("sisReleased"),
    },
    {
      header: "Contract",
      value: (show) => show.build?.contract === "done" ? "FEC" : (show.build?.contract ?? ""),
      align: "CENTER",
      width: 130,
      background: statusBackground("contract"),
    },
    {
      header: "Livestream",
      key: "build.livestream",
      align: "CENTER",
      width: 100,
      background: statusBackground("livestream"),
    },
    {
      header: "Workbook",
      key: "build.workbook",
      align: "CENTER",
      width: 90,
      background: statusBackground("workbook"),
    },
  ],
};

export default productionStatusReport;
