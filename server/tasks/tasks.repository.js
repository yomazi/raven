import Task from "../models/Task.js";

class TasksRepository {
  static async findAll(filter, sort, order) {
    const sortField = ["createdAt", "updatedAt"].includes(sort) ? sort : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const tasks = await Task.find(filter)
      .sort({ [sortField]: sortOrder })
      .lean();

    return tasks;
  }

  static async findOne(id) {
    const task = await Task.findById(id).lean();

    return task;
  }

  static async create(params) {
    const { showFolderId, description, priority, status, notes } = params;
    const task = await Task.create({
      showFolderId: showFolderId || null,
      description: description.trim(),
      priority: priority || "medium",
      status: status || "open",
      notes: notes || "",
    });

    return task;
  }

  static async upsertOne(id, updates) {
    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return task;
  }

  static async delete(id) {
    const result = await Task.findByIdAndDelete(id);

    return result;
  }
}

export default TasksRepository;
