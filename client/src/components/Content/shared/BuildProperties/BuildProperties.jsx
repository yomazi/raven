import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import { useShowBuild } from "@hooks/useShowBuild.js";
import { useShowSchedule } from "@hooks/useShowSchedule.js";
import * as Accordion from "@radix-ui/react-accordion";
import { BASE_STATUS, ROLLUP_STATUS } from "@shared/constants/builds.js";
import { deriveAllRollups } from "@shared/functions/builds.js";
import { RELEASE_MODES, RELEASE_MODE_LABELS } from "@shared/constants/schedule.js";
import { useCallback, useRef, useState } from "react";
import styles from "./BuildProperties.module.css";

// ---------------------------------------------------------------------------
// RollupBadge
// ---------------------------------------------------------------------------

function RollupBadge({ value, disabled }) {
  if (!value) return null;
  const statusMap = {
    [ROLLUP_STATUS.NOT_STARTED]: "to_do",
    [ROLLUP_STATUS.IN_PROGRESS]: "in_progress",
    [ROLLUP_STATUS.BLOCKED]: "blocked",
    [ROLLUP_STATUS.DONE]: "done",
    [ROLLUP_STATUS.NA]: "done",
  };
  const status = statusMap[value] ?? "to_do";
  return (
    <span
      className={`${styles.rollupBadge} ${disabled ? styles.rollupBadgeDisabled : ""}`}
      data-status={status}
    >
      {value === ROLLUP_STATUS.NA ? "done" : value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FieldRow
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  field,
  value,
  options,
  onChange,
  dateValue,
  dateLabel,
  readonly,
  disabled,
  title,
}) {
  const labels = Object.fromEntries(options.map((o) => [o, o]));
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <BadgeSelect
        value={value ?? "n/a"}
        options={options}
        labels={labels}
        variant="status"
        onChange={(newVal) => onChange(field, newVal)}
        readonly={readonly}
        disabled={disabled}
        title={title}
      />
      {dateValue && (
        <span className={styles.autoDate} title={dateLabel}>
          {new Date(dateValue).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateRow — date-only input (used in build phases)
// ---------------------------------------------------------------------------

function DateRow({ label, field, value, onChange, overdue }) {
  function handleChange(e) {
    onChange(field, e.target.value ? new Date(e.target.value) : null);
  }
  const formatted = value ? new Date(value).toISOString().split("T")[0] : "";
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="date"
        className={styles.dateInput}
        value={formatted}
        onChange={handleChange}
        data-overdue={overdue ?? false}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateTimeRow — date + time inputs that commit together on either change.
// Keeps local draft state so the two inputs stay in sync before committing.
// ---------------------------------------------------------------------------

function DateTimeRow({ label, field, value, onChange }) {
  // datetime-local expects "YYYY-MM-DDTHH:MM" (no seconds, no Z)
  const formatted = value ? new Date(value).toISOString().slice(0, 16) : "";

  function handleChange(e) {
    onChange(field, e.target.value ? new Date(e.target.value) : null);
  }

  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="datetime-local"
        className={styles.dateInput}
        value={formatted}
        onChange={handleChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhaseSection
// ---------------------------------------------------------------------------

function PhaseSection({ title, rollup, value, children, disabled }) {
  return (
    <Accordion.Item value={value} className={styles.phase} disabled={disabled}>
      <Accordion.Header>
        <Accordion.Trigger className={styles.phaseHeader}>
          <span className={styles.phaseTitle}>{title}</span>
          <RollupBadge value={rollup} disabled={disabled} />
          {!disabled && <span className={styles.phaseChevron}>▾</span>}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className={styles.phaseContent}>
        <div className={styles.phaseBody}>{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ---------------------------------------------------------------------------
// GmailLinks
// ---------------------------------------------------------------------------

function GmailLinks({ links = [], onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  function handleAdd() {
    const url = input.trim();
    if (!url) return;
    onAdd(url);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className={styles.gmailLinks}>
      <span className={styles.fieldLabel}>Gmail links</span>
      <div className={styles.linkList}>
        {links.map((url) => (
          <div key={url} className={styles.linkRow}>
            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
              {url}
            </a>
            <button
              className={styles.removeLinkBtn}
              onClick={() => onRemove(url)}
              aria-label="Remove link"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className={styles.addLink}>
        <input
          ref={inputRef}
          type="url"
          className={styles.linkInput}
          placeholder="Paste Gmail URL…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className={styles.addLinkBtn} onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PresaleRow — one presale with local draft for the name field
// ---------------------------------------------------------------------------

function PresaleRow({ presale, index, onUpdate, onRemove }) {
  const [draftName, setDraftName] = useState(null); // null = not editing

  const displayName = draftName ?? presale.name ?? "Donor Presale";

  function handleNameBlur() {
    if (draftName !== null && draftName !== presale.name) {
      onUpdate(index, { name: draftName });
    }
    setDraftName(null); // exit draft mode; prop is now source of truth again
  }

  return (
    <div className={styles.presaleCard}>
      <div className={styles.presaleCardHeader}>
        <span className={styles.presaleCardTitle}>Presale {index + 1}</span>
        <button className={styles.removeButton} onClick={() => onRemove(index)}>
          Remove
        </button>
      </div>

      <div className={styles.scheduleGrid}>
        <span className={styles.scheduleLabel}>Name</span>
        <input
          type="text"
          className={styles.textInput}
          value={displayName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={handleNameBlur}
        />

        <span className={styles.scheduleLabel}>Start</span>
        <input
          type="datetime-local"
          className={styles.dateInput}
          value={toDateTimeLocal(presale.startDateTime)}
          onChange={(e) =>
            onUpdate(index, {
              startDateTime: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />

        <span className={styles.scheduleLabel}>End</span>
        <input
          type="datetime-local"
          className={styles.dateInput}
          value={toDateTimeLocal(presale.endDateTime)}
          onChange={(e) =>
            onUpdate(index, {
              endDateTime: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleSection
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ScheduleSection
// ---------------------------------------------------------------------------

function ScheduleSection({
  schedule,
  initialNotes,
  setField,
  setReleaseMode,
  addPresale,
  updatePresale,
  removePresale,
}) {
  const presales = schedule.presales ?? [];
  const releaseMode = schedule.releaseMode ?? "asap";
  const isOnSchedule = releaseMode === "on-schedule";
  const showDates = releaseMode === "on-schedule" || releaseMode === "tbd";

  const handleBlurNotes = useCallback((e) => setField("notes", e.target.value), [setField]);

  return (
    <div className={styles.contextPane}>
      <div className={styles.scheduleGrid}>
        <span className={styles.scheduleLabel}>Release</span>
        <div className={styles.radioGroup}>
          {RELEASE_MODES.map((mode) => (
            <label key={mode} className={styles.radioLabel}>
              <input
                type="radio"
                name="build-release-mode"
                className={styles.radio}
                checked={releaseMode === mode}
                onChange={() => setReleaseMode(mode)}
              />
              {RELEASE_MODE_LABELS[mode]}
            </label>
          ))}
        </div>

        {showDates && (
          <>
            <span className={styles.scheduleLabel}>Announce Date</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={toDateTimeLocal(schedule.announceDateTime)}
              onChange={(e) =>
                setField("announceDateTime", e.target.value ? new Date(e.target.value) : null)
              }
            />

            <span className={styles.scheduleLabel}>On Sale Date</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={toDateTimeLocal(schedule.onSaleDateTime)}
              onChange={(e) =>
                setField("onSaleDateTime", e.target.value ? new Date(e.target.value) : null)
              }
            />
          </>
        )}
      </div>

      {isOnSchedule && (
        <>
          {presales.length > 0 && (
            <div className={styles.presalesGroup}>
              {presales.map((presale, i) => (
                <PresaleRow
                  key={i}
                  presale={presale}
                  index={i}
                  onUpdate={updatePresale}
                  onRemove={removePresale}
                />
              ))}
            </div>
          )}

          <button className={styles.addPresaleBtn} onClick={addPresale}>
            + Add Presale
          </button>
        </>
      )}

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Announce / On Sale notes</span>
        <textarea
          className={styles.textarea}
          defaultValue={initialNotes ?? ""}
          onBlur={handleBlurNotes}
          rows={2}
        />
      </div>
    </div>
  );
}

// datetime-local inputs expect local time, not UTC
function toDateTimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------

function isOverdue(date, workdays = 5) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  let cursor = new Date(today);
  while (cursor > d) {
    cursor.setDate(cursor.getDate() - 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    if (count >= workdays) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// BuildProperties
// ---------------------------------------------------------------------------

export default function BuildProperties({ show }) {
  const { build, setField: setBuildField, addGmailLink, removeGmailLink } = useShowBuild(show);
  const {
    schedule,
    setField: setScheduleField,
    setReleaseMode,
    addPresale,
    updatePresale,
    removePresale,
  } = useShowSchedule(show);
  const rollups = deriveAllRollups(build);

  const handleBlurText = useCallback(
    (field) => (e) => {
      setBuildField(field, e.target.value);
    },
    [setBuildField]
  );

  return (
    <div className={styles.section}>
      {/* ── Schedule ──────────────────────────────────────────────────── */}
      {/* initialNotes reads straight off `show` (always in sync with the
          current show prop) rather than the `schedule` state from
          useShowSchedule, which only catches up to a new show via an effect
          — one render behind the key change below, so an uncontrolled
          field seeded from it would remount showing the *previous* show's
          value instead of this one's. */}
      <ScheduleSection
        key={show?.googleFolderId}
        schedule={schedule}
        initialNotes={show?.schedule?.notes}
        setField={setScheduleField}
        setReleaseMode={setReleaseMode}
        addPresale={addPresale}
        updatePresale={updatePresale}
        removePresale={removePresale}
      />

      {/* ── Build context pane ────────────────────────────────────────── */}
      <div className={styles.contextPane}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Notes:</span>
          {/* defaultValue reads straight off `show` for the same reason as
              ScheduleSection's initialNotes above — `build` state from
              useShowBuild lags a render behind this key change. */}
          <textarea
            key={show?.googleFolderId}
            className={styles.textarea}
            defaultValue={show?.build?.notes ?? ""}
            onBlur={handleBlurText("notes")}
            rows={3}
          />
        </div>

        <GmailLinks
          links={build.gmailLinks ?? []}
          onAdd={addGmailLink}
          onRemove={removeGmailLink}
        />

        {build.dateConfirmed && (
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Date Confirmed:</span>
            <span className={styles.autoDate}>
              {new Date(build.dateConfirmed).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Phase accordion ───────────────────────────────────────────── */}
      <Accordion.Root type="multiple" defaultValue={["setup", "build", "close"]}>
        <PhaseSection title="Setup" value="setup" rollup={rollups.setup}>
          <FieldRow
            label="Show Folder Created:"
            field="showFolder"
            value={build.showFolder}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Calendar Updated:"
            field="calendarUpdated"
            value={build.calendarUpdated}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Booking Spreadsheet Updated:"
            field="bookingSpreadsheet"
            value={build.bookingSpreadsheet}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Offer In Folder:"
            field="offerInFolder"
            value={build.offerInFolder}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Packet Sent:"
            field="packetSent"
            value={build.packetSent}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="SIS Populated:"
            field="sisPopulated"
            value={build.sisPopulated}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          {build.dateSetupComplete && (
            <div className={styles.phaseComplete}>
              Setup complete {new Date(build.dateSetupComplete).toLocaleDateString()}
            </div>
          )}
        </PhaseSection>

        <PhaseSection title="Build" value="build" rollup={rollups.build}>
          <FieldRow
            label="Tessitura"
            field="tessitura"
            value={build.tessitura}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="TNEW"
            field="tnew"
            value={build.tnew}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Marketing assets"
            field="marketingAssetsCompiled"
            value={build.marketingAssetsCompiled}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <DateRow
            label="Assets last checkin"
            field="marketingAssetsLastCheckin"
            value={build.marketingAssetsLastCheckin}
            onChange={setBuildField}
            overdue={isOverdue(build.marketingAssetsLastCheckin)}
          />
          <FieldRow
            label="SIS released"
            field="sisReleased"
            value={build.sisReleased}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          {build.dateBuildComplete && (
            <div className={styles.phaseComplete}>
              Build complete {new Date(build.dateBuildComplete).toLocaleDateString()}
            </div>
          )}
        </PhaseSection>

        <PhaseSection title="Close" value="close" rollup={rollups.close} disabled>
          <FieldRow
            label="Contracts"
            field="contract"
            value={build.contract}
            options={BASE_STATUS}
            onChange={() => {}}
            disabled
            title="Computed from the Contracts section — edit individual contracts there."
          />
          <FieldRow
            label="Livestream"
            field="livestream"
            value={build.livestream}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          <FieldRow
            label="Workbook"
            field="workbook"
            value={build.workbook}
            options={BASE_STATUS}
            onChange={setBuildField}
          />
          {build.dateCloseComplete && (
            <div className={styles.phaseComplete}>
              Close complete {new Date(build.dateCloseComplete).toLocaleDateString()}
            </div>
          )}
        </PhaseSection>
      </Accordion.Root>
    </div>
  );
}
