import createError from "http-errors";
import ReportSchedule from "../models/ReportSchedule.js";
import { getDefinition, listDefinitions } from "./definitions/index.js";
import ReportScheduler from "./report-scheduler.js";
import ReportService from "./reports.service.js";

class ReportsController {
  // ── Report definitions ────────────────────────────────────────────────────

  static async listReports(req, res, next) {
    try {
      res.json(listDefinitions());
    } catch (err) {
      next(err);
    }
  }

  static async generateReport(req, res, next) {
    try {
      const { name } = req.body;
      const definition = getDefinition(name);
      if (!definition) throw createError.NotFound(`No report definition found: "${name}"`);

      const result = await ReportService.generateReport(definition);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ── Schedules ─────────────────────────────────────────────────────────────

  static async listSchedules(req, res, next) {
    try {
      const schedules = await ReportSchedule.find().lean();
      res.json(schedules);
    } catch (err) {
      next(err);
    }
  }

  static async upsertSchedule(req, res, next) {
    try {
      const { reportName } = req.params;
      const { cronExpression, enabled } = req.body;

      if (!getDefinition(reportName)) {
        throw createError.NotFound(`No report definition found: "${reportName}"`);
      }

      const schedule = await ReportSchedule.findOneAndUpdate(
        { reportName },
        { cronExpression, enabled },
        { upsert: true, new: true, runValidators: true }
      );

      ReportScheduler.sync(schedule);

      res.json(schedule);
    } catch (err) {
      next(err);
    }
  }

  static async deleteSchedule(req, res, next) {
    try {
      const { reportName } = req.params;
      await ReportSchedule.deleteOne({ reportName });
      ReportScheduler.unregister(reportName);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
}

export default ReportsController;
