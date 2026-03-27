import mongoose from "mongoose";

const PRIORITY = ["urgent", "high", "medium", "low"];
const STATUS = ["open", "resolved", "blocked", "shrug"];

const TaskSchema = new mongoose.Schema(
  {
    showFolderId: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: PRIORITY,
      required: true,
      default: "medium",
    },
    status: {
      type: String,
      enum: STATUS,
      required: true,
      default: "open",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

export const TASK_PRIORITY = PRIORITY;
export const TASK_STATUS = STATUS;

const Task = mongoose.model("Task", TaskSchema, "Tasks");
export default Task;
