import createError from "http-errors";
import { getLiveDefinition, listLiveDefinitions } from "./index.js";
import LiveReportService from "./live-report.service.js";

class LiveReportsController {
  static async list(req, res, next) {
    try {
      res.json(listLiveDefinitions());
    } catch (err) {
      next(err);
    }
  }

  static async getStatus(req, res, next) {
    try {
      const { reportName } = req.params;
      if (!getLiveDefinition(reportName)) {
        throw createError.NotFound(`No live report definition found: "${reportName}"`);
      }

      const status = await LiveReportService.getStatus(reportName);
      if (!status) throw createError.NotFound(`Live report "${reportName}" is not attached to a spreadsheet yet`);

      res.json(status);
    } catch (err) {
      next(err);
    }
  }

  static async ensure(req, res, next) {
    try {
      const { reportName } = req.params;

      if (!getLiveDefinition(reportName)) {
        throw createError.NotFound(`No live report definition found: "${reportName}"`);
      }

      const liveReport = await LiveReportService.ensure(reportName);
      res.json(liveReport);
    } catch (err) {
      next(err);
    }
  }
}

export default LiveReportsController;
