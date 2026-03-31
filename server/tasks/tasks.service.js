import TasksRepository from "./tasks.repository.js";

class TasksService {
  static async getAllTasks(params) {
    const { showFolderId, linked, status, priority, sort, order } = params;
    const filter = {};

    if (showFolderId) {
      filter.showFolderId = showFolderId;
    } else if (linked === true) {
      filter.showFolderId = { $ne: null };
    } else if (linked === false) {
      filter.showFolderId = null;
    }

    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (priority) {
      const priorities = priority.split(",").map((p) => p.trim());
      filter.priority = priorities.length === 1 ? priorities[0] : { $in: priorities };
    }

    const tasks = await TasksRepository.findAll(filter, sort, order);

    return tasks;
  }

  static async getTask(id) {
    const task = await TasksRepository.findOne(id);

    return task;
  }

  static async addTask(params) {
    const task = await TasksRepository.create(params);

    return task;
  }

  static async updateTask(id, params) {
    const allowed = ["showFolderId", "description", "priority", "status", "notes"];
    const updates = {};

    for (const key of allowed) {
      if (key in params) updates[key] = params[key];
    }

    const task = await TasksRepository.upsertOne(id, updates);

    return task;
  }

  static async deleteTask(id) {
    const result = await TasksRepository.delete(id);

    return result;
  }
}

export default TasksService;
