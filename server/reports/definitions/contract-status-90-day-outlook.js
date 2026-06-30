
const FOLDER_ID = process.env.REPORT_CONTRACT_STATUS_90_DAY ?? "REPLACE_WITH_DRIVE_FOLDER_ID";

const rgb = (r, g, b) => ({ red: r / 255, green: g / 255, blue: b / 255 });

const STATUS_COLORS = {
  done: rgb(182, 215, 168),
  blocked: rgb(234, 153, 153),
  "waiting for them": rgb(255, 229, 153),
  "waiting for us": rgb(234, 153, 153),
  "drafted by us": rgb(207, 226, 255),
  "drafted by them": rgb(207, 226, 255),
  "in progress": rgb(255, 229, 153),
  "to do": rgb(217, 217, 217), // grey — untouched
  "n/a": rgb(255, 255, 255), // white — not applicable
  "n/a": rgb(217, 217, 217),
};

const contractStatus90DayOutlook = {
  name: "contract-status-90-day-outlook",

  folderId: FOLDER_ID,

  title: (now) => {
    const stamp = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `Contract Status (90 day outlook): week of ${stamp}`;
  },

  filter: (shows) => {
    const now = new Date();
    const in90Days = new Date(now);
    in90Days.setDate(in90Days.getDate() + 90);
    return shows.filter(
      (s) =>
        s.build?.shouldShowInRoster &&
        s.date >= now &&
        s.date <= in90Days &&
        s.build?.contract !== "n/a"
    );
  },

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
      hyperlink: (show) =>
        show.googleFolderId
          ? `https://drive.google.com/drive/folders/${show.googleFolderId}`
          : null,
      align: "LEFT",
      autoWidth: true,
      autoWidthPadding: 24,
    },
    {
      header: "Contract",
      key: "build.contract",
      value: (show) => show.build?.contract === "done" ? "FEC" : (show.build?.contract ?? ""),
      align: "CENTER",
      width: 130,
      background: (show) => STATUS_COLORS[show?.build?.contract] ?? null,
    },
  ],
};

export default contractStatus90DayOutlook;
