import { useGenerateReport } from "@hooks/useGenerateReport.js";
import { useReportSchedules, useUpsertSchedule } from "@hooks/useReportSchedules.js";
import { useReports } from "@hooks/useReports.js";
import { useState } from "react";
import styles from "./ReportsPanel.module.css";

const FREQUENCIES = [
  { label: "Not scheduled", value: "" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Monday mornings at 8am", value: "0 8 * * 1" },
  { label: "Friday mornings at 8am", value: "0 8 * * 5" },
  { label: "Custom…", value: "custom" },
];

function formatDate(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReportRow({ report, schedule }) {
  const { mutate: generate, isPending: isGenerating, data: generateResult } = useGenerateReport();
  const { mutate: upsert, isPending: isSaving } = useUpsertSchedule();

  const currentCron = schedule?.cronExpression ?? "";
  const currentEnabled = schedule?.enabled ?? false;

  const matchedFreq = FREQUENCIES.find((f) => f.value === currentCron && f.value !== "custom");
  const isCustom = currentCron && !matchedFreq;

  const [freqValue, setFreqValue] = useState(isCustom ? "custom" : (currentCron || ""));
  const [customCron, setCustomCron] = useState(isCustom ? currentCron : "");
  const [enabled, setEnabled] = useState(currentEnabled);

  const resolvedCron = freqValue === "custom" ? customCron : freqValue;
  const hasSchedule = !!resolvedCron;
  const isDirty =
    resolvedCron !== currentCron || enabled !== currentEnabled;

  function saveSchedule() {
    if (!resolvedCron) return;
    upsert({ reportName: report.name, cronExpression: resolvedCron, enabled });
  }

  function handleFreqChange(e) {
    const val = e.target.value;
    setFreqValue(val);
    if (val !== "custom" && val !== "") setEnabled(true);
    if (val === "") setEnabled(false);
  }

  const lastResult = schedule?.lastResult;

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.reportName}>{report.name}</span>
        <button
          className={styles.runBtn}
          onClick={() => generate(report.name)}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating…" : "Run Now"}
        </button>
      </div>

      {generateResult && (
        <div className={styles.runResult}>
          Generated:{" "}
          <a href={generateResult.spreadsheetUrl} target="_blank" rel="noreferrer">
            {generateResult.title}
          </a>{" "}
          ({generateResult.showCount} rows)
        </div>
      )}

      <div className={styles.scheduleSection}>
        <div className={styles.scheduleRow}>
          <label className={styles.scheduleLabel}>Schedule</label>
          <select className={styles.select} value={freqValue} onChange={handleFreqChange}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {freqValue === "custom" && (
            <input
              className={styles.cronInput}
              placeholder="e.g. 0 8 * * 1"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
            />
          )}
        </div>

        {hasSchedule && (
          <div className={styles.scheduleRow}>
            <label className={styles.scheduleLabel}>Enabled</label>
            <button
              className={styles.toggle}
              data-active={enabled || undefined}
              onClick={() => setEnabled((v) => !v)}
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>
        )}

        {isDirty && (
          <button className={styles.saveBtn} onClick={saveSchedule} disabled={isSaving || !resolvedCron}>
            {isSaving ? "Saving…" : "Save schedule"}
          </button>
        )}
      </div>

      <div className={styles.meta}>
        <span className={styles.metaLabel}>Last run:</span>
        <span>{formatDate(schedule?.lastRunAt)}</span>
        {lastResult && (
          <span className={lastResult.success ? styles.ok : styles.err}>
            {lastResult.success ? "✓" : "✗"} {lastResult.message}
          </span>
        )}
        {lastResult?.spreadsheetUrl && (
          <a href={lastResult.spreadsheetUrl} target="_blank" rel="noreferrer" className={styles.sheetLink}>
            Open
          </a>
        )}
      </div>
    </div>
  );
}

export default function ReportsPanel() {
  const { data: reports = [], isLoading: reportsLoading } = useReports();
  const { data: schedules = [], isLoading: schedulesLoading } = useReportSchedules();

  if (reportsLoading || schedulesLoading) {
    return <div className={styles.empty}>Loading…</div>;
  }

  const scheduleByName = Object.fromEntries(schedules.map((s) => [s.reportName, s]));

  return (
    <div className={styles.root}>
      <div className={styles.heading}>Reports</div>
      {reports.map((report) => (
        <ReportRow key={report.name} report={report} schedule={scheduleByName[report.name]} />
      ))}
    </div>
  );
}
