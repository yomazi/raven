import mongoose from "mongoose";

const { Schema } = mongoose;

// Raised when BookingSheetsService can't confidently place a contract's
// status into its booking-spreadsheet row (see server/booking-sheets/). One
// doc per {googleFolderId, contractId} — re-syncing an already-failing
// contract updates the same doc rather than piling up duplicates.
const bookingSyncIssueSchema = new Schema(
  {
    googleFolderId: { type: String, required: true },
    contractId: { type: String, required: true },
    artist: { type: String, required: true },
    signee: { type: String, required: true },
    date: { type: Date, required: true },
    reason: { type: String, enum: ["no_match", "ambiguous_match"], required: true },
    candidateRowCount: { type: Number, default: 0 },
    // Whether the sheet's date group (col A/B) was found at all — governs
    // whether "add row" can be offered (it inserts relative to that group).
    dateGroupFound: { type: Boolean, default: false },
    spreadsheetId: { type: String, required: true },
    sheetTitle: { type: String, required: true },
    // The tab's numeric gid (Sheets' internal id, distinct from its title) —
    // lets the client link straight to "#gid=<sheetGid>" instead of just the
    // spreadsheet root.
    sheetGid: { type: Number, required: true },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "BookingSyncIssues" }
);

bookingSyncIssueSchema.index({ googleFolderId: 1, contractId: 1 }, { unique: true });

const BookingSyncIssue = mongoose.model("BookingSyncIssue", bookingSyncIssueSchema, "BookingSyncIssues");

export default BookingSyncIssue;
