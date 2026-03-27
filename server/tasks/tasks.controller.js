import TasksService from "./tasks.service.js";

class TasksController {
  static async getAllTasks(req, res) {
    try {
      const params = { ...req.query };
      const tasks = await TasksService.getAllTasks(params);

      res.json({ success: true, tasks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTask(req, res) {
    try {
      const { id } = req.params;
      const task = await TasksService.getTask(id);

      if (!task) return res.status(404).json({ success: false, error: "Task not found" });
      res.json({ success: true, task });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async addTask(req, res) {
    try {
      const params = { ...req.body };
      const task = await TasksService.addTask(params);

      res.status(201).json({ success: true, task });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateTask(req, res) {
    try {
      const { id } = req.params;
      const params = { ...req.body };
      const task = await TasksService.updateTask(id, params);

      if (!task) return res.status(404).json({ success: false, error: "Task not found" });
      res.json({ success: true, task });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const result = await TasksService.deleteTask(id);
      if (!result) return res.status(404).json({ success: false, error: "Task not found" });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default TasksController;
