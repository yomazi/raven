import cron from "node-cron";
import ReportSchedule from "../models/ReportSchedule.js";
import { getDefinition } from "./definitions/index.js";
import ReportService from "./reports.service.js";

// In-memory registry of active cron tasks keyed by reportName.
const activeTasks = new Map();

async function runReport(reportName) {
  const definition = getDefinition(reportName);
  if (!definition) {
    console.error(`[Scheduler] No definition found for report: "${reportName}"`);
    return;
  }

  console.log(`[Scheduler] Running report: "${reportName}"`);

  try {
    const result = await ReportService.generateReport(definition);
    await ReportSchedule.findOneAndUpdate(
      { reportName },
      {
        lastRunAt: new Date(),
        lastResult: { success: true, message: "OK", spreadsheetUrl: result.spreadsheetUrl },
      }
    );
    console.log(`[Scheduler] Report "${reportName}" complete: ${result.spreadsheetUrl}`);
  } catch (err) {
    await ReportSchedule.findOneAndUpdate(
      { reportName },
      {
        lastRunAt: new Date(),
        lastResult: { success: false, message: err.message, spreadsheetUrl: null },
      }
    );
    console.error(`[Scheduler] Report "${reportName}" failed: ${err.message}`);
  }
}

function register(reportName, cronExpression) {
  // Remove any existing task for this report first.
  unregister(reportName);

  if (!cron.validate(cronExpression)) {
    console.warn(`[Scheduler] Invalid cron expression for "${reportName}": "${cronExpression}"`);
    return;
  }

  const task = cron.schedule(cronExpression, () => runReport(reportName), { scheduled: true });
  activeTasks.set(reportName, task);
  console.log(`[Scheduler] Registered "${reportName}" → "${cronExpression}"`);
}

function unregister(reportName) {
  const existing = activeTasks.get(reportName);
  if (existing) {
    existing.stop();
    activeTasks.delete(reportName);
    console.log(`[Scheduler] Unregistered "${reportName}"`);
  }
}

// Called at server startup — loads all enabled schedules from DB and registers them.
async function start() {
  const schedules = await ReportSchedule.find({ enabled: true });
  for (const schedule of schedules) {
    register(schedule.reportName, schedule.cronExpression);
  }
  console.log(`[Scheduler] Started with ${schedules.length} active schedule(s)`);
}

// Called by the API when a schedule is created, updated, or toggled.
function sync(schedule) {
  if (schedule.enabled) {
    register(schedule.reportName, schedule.cronExpression);
  } else {
    unregister(schedule.reportName);
  }
}

export default { start, sync, unregister, runReport };
