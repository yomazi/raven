import mongoose from "mongoose";

const LogEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, index: true },
    level: { type: String, required: true, index: true },
    operation: { type: String, index: true },
    message: { type: String, required: true },
    detail: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
  },
  { collection: "Logs" }
);

const LogEntry = mongoose.model("LogEntry", LogEntrySchema);
export default LogEntry;
