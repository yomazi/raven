import mongoose from "mongoose";

const { Schema } = mongoose;

const reportScheduleSchema = new Schema(
  {
    reportName: { type: String, required: true, unique: true },
    cronExpression: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    lastRunAt: { type: Date, default: null },
    lastResult: {
      success: { type: Boolean, default: null },
      message: { type: String, default: null },
      spreadsheetUrl: { type: String, default: null },
    },
  },
  { timestamps: true }
);

const ReportSchedule = mongoose.model("ReportSchedule", reportScheduleSchema);

export default ReportSchedule;
