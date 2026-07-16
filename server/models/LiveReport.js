import mongoose from "mongoose";

const { Schema } = mongoose;

// One cached sheet row: Raven-owned + staff-comment columns, in sheet column
// order. This is what lets Raven rebuild a live report's spreadsheet from
// scratch (e.g. after a row is added/removed) without losing anything staff
// typed into the comment columns, since it's refreshed by reading the sheet
// immediately before every write.
const liveReportRowSchema = new Schema(
  {
    rowKey: { type: String, required: true },
    values: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const liveReportSchema = new Schema(
  {
    reportName: { type: String, required: true },
    // Lets the same report definition point at a test vs. a prod
    // spreadsheet/folder without either environment clobbering the other.
    environment: { type: String, enum: ["test", "prod"], required: true, default: "test" },
    spreadsheetId: { type: String, required: true },
    spreadsheetUrl: { type: String },
    sheetId: { type: Number, default: 0 },
    rows: { type: [liveReportRowSchema], default: [] },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "LiveReports" }
);

liveReportSchema.index({ reportName: 1, environment: 1 }, { unique: true });

const LiveReport = mongoose.model("LiveReport", liveReportSchema, "LiveReports");

export default LiveReport;
