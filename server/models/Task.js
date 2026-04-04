import mongoose from "mongoose";
import { TASK_PRIORITY, TASK_STATUS } from "../../shared/constants/tasks.js";

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
      enum: TASK_PRIORITY,
      required: true,
      default: "medium",
    },
    status: {
      type: String,
      enum: TASK_STATUS,
      required: true,
      default: "todo",
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

const Task = mongoose.model("Task", TaskSchema, "Tasks");
export default Task;
