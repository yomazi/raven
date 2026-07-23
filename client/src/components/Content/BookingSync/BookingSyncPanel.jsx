import {
  useAddRowForIssue,
  useBookingSyncIssues,
  useDismissIssue,
} from "@hooks/useBookingSyncIssues.js";
import styles from "./BookingSyncPanel.module.css";

const REASON_LABEL = {
  no_match: "No matching row found",
  ambiguous_match: "Multiple matching rows found",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function IssueRow({ issue }) {
  const { mutate: addRow, isPending: isAdding, error: addError } = useAddRowForIssue();
  const { mutate: dismiss, isPending: isDismissing } = useDismissIssue();

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>
        <span className={styles.artist}>{issue.artist}</span>
        <span className={styles.signee}>{issue.signee}</span>
        <span className={styles.date}>{formatDate(issue.date)}</span>
      </div>
      <div className={styles.meta}>
        <span className={styles.reason}>{REASON_LABEL[issue.reason] ?? issue.reason}</span>
        <a
          className={styles.sheetLink}
          href={`https://docs.google.com/spreadsheets/d/${issue.spreadsheetId}/edit#gid=${issue.sheetGid}`}
          target="_blank"
          rel="noreferrer"
        >
          {issue.sheetTitle}
        </a>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.addRowBtn}
          onClick={() => addRow(issue._id)}
          disabled={isAdding || isDismissing || !issue.dateGroupFound}
          title={
            issue.dateGroupFound
              ? undefined
              : "The date row itself wasn't found in the sheet — add it there first"
          }
        >
          {isAdding ? "Adding…" : "Add Row"}
        </button>
        <button
          className={styles.dismissBtn}
          onClick={() => dismiss(issue._id)}
          disabled={isAdding || isDismissing}
        >
          {isDismissing ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
      {addError && <div className={styles.errText}>{addError.response?.data?.error ?? addError.message}</div>}
    </div>
  );
}

export default function BookingSyncPanel() {
  const { data: issues = [], isLoading } = useBookingSyncIssues();

  if (isLoading) {
    return <div className={styles.empty}>Loading…</div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.heading}>Booking Sync</div>
      {issues.length === 0 ? (
        <div className={styles.empty}>No unresolved booking sync issues.</div>
      ) : (
        issues.map((issue) => <IssueRow key={issue._id} issue={issue} />)
      )}
    </div>
  );
}
