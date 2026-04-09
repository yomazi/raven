// client/src/components/Content/Events/ShowProperties/sections/BuildSection/BuildSection.jsx

import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import { useShowBuild } from "@hooks/useShowBuild.js";
import * as Accordion from "@radix-ui/react-accordion";
import { BASE_STATUS, CONTRACT_STATUS, ROLLUP_STATUS } from "@shared/constants/builds.js";
import { deriveAllRollups } from "@shared/functions/builds.js";
import { useCallback, useRef, useState } from "react";
import styles from "./BuildProperties.module.css";

// ---------------------------------------------------------------------------
// Status badge styling — maps status values to CSS data attributes
// so the design system handles colors via data-status selectors.
// ---------------------------------------------------------------------------

/*
function badgeDataAttr(value) {
  return { "data-status": value?.replace(/\s+/g, "-") };
}
*/

// ---------------------------------------------------------------------------
// Rollup badge
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
// Field row — label + badge selector + optional date
// ---------------------------------------------------------------------------

function FieldRow({ label, field, value, options, onChange, dateValue, dateLabel }) {
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
// Date field row — label + date input
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
// Phase section — header with rollup + collapsible body
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
// Gmail links pane
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

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
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
          onKeyDown={handleKeyDown}
        />
        <button className={styles.addLinkBtn} onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// isOverdue — returns true if date is more than N workdays in the past
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
// BuildSection
// ---------------------------------------------------------------------------

export default function BuildProperties({ show }) {
  const { build, setField, addGmailLink, removeGmailLink } = useShowBuild(show);
  const rollups = deriveAllRollups(build);

  const handleBlurText = useCallback(
    (field) => (e) => {
      setField(field, e.target.value);
    },
    [setField]
  );

  return (
    <div className={styles.section}>
      {/* ── Context pane ──────────────────────────────────────────────── */}
      <div className={styles.contextPane}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Announce / On Sale:</span>
          <textarea
            className={styles.textarea}
            defaultValue={build.announceOnSaleNotes ?? ""}
            onBlur={handleBlurText("announceOnSaleNotes")}
            rows={2}
          />
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Notes:</span>
          <textarea
            className={styles.textarea}
            defaultValue={build.notes ?? ""}
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

      {/* ── Setup ─────────────────────────────────────────────────────── */}
      <Accordion.Root type="multiple" defaultValue={["setup", "build", "close"]}>
        <PhaseSection title="Setup" value="setup" rollup={rollups.setup}>
          <FieldRow
            label="Show Folder Created:"
            field="showFolder"
            value={build.showFolder}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Calendar Updated:"
            field="calendarUpdated"
            value={build.calendarUpdated}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Booking Spreadsheet Updated:"
            field="bookingSpreadsheet"
            value={build.bookingSpreadsheet}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Offer In Folder:"
            field="offerInFolder"
            value={build.offerInFolder}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Packet Sent:"
            field="packetSent"
            value={build.packetSent}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="SIS Populated:"
            field="sisPopulated"
            value={build.sisPopulated}
            options={BASE_STATUS}
            onChange={setField}
          />
          {build.dateSetupComplete && (
            <div className={styles.phaseComplete}>
              Setup complete {new Date(build.dateSetupComplete).toLocaleDateString()}
            </div>
          )}
        </PhaseSection>

        {/* ── Build ─────────────────────────────────────────────────────── */}
        <PhaseSection title="Build" value="build" rollup={rollups.build}>
          <FieldRow
            label="Tessitura"
            field="tessitura"
            value={build.tessitura}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="TNEW"
            field="tnew"
            value={build.tnew}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Marketing assets"
            field="marketingAssetsCompiled"
            value={build.marketingAssetsCompiled}
            options={BASE_STATUS}
            onChange={setField}
          />
          <DateRow
            label="Assets last checkin"
            field="marketingAssetsLastCheckin"
            value={build.marketingAssetsLastCheckin}
            onChange={setField}
            overdue={isOverdue(build.marketingAssetsLastCheckin)}
          />
          <FieldRow
            label="SIS released"
            field="sisReleased"
            value={build.sisReleased}
            options={BASE_STATUS}
            onChange={setField}
          />
          {build.dateBuildComplete && (
            <div className={styles.phaseComplete}>
              Build complete {new Date(build.dateBuildComplete).toLocaleDateString()}
            </div>
          )}
        </PhaseSection>

        {/* ── Close ─────────────────────────────────────────────────────── */}
        <PhaseSection title="Close" value="close" rollup={rollups.close} disabled>
          <FieldRow
            label="Contract"
            field="contract"
            value={build.contract}
            options={CONTRACT_STATUS}
            onChange={setField}
          />
          <DateRow
            label="Contract last checkin"
            field="contractLastCheckin"
            value={build.contractLastCheckin}
            onChange={setField}
            overdue={isOverdue(build.contractLastCheckin)}
          />
          <div className={styles.checkboxRow}>
            <span className={styles.fieldLabel}>We drafted contract</span>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={build.weDraftedContract ?? false}
              onChange={(e) => setField("weDraftedContract", e.target.checked)}
            />
          </div>
          {build.dateDrafted && (
            <div className={styles.autoDateRow}>
              <span className={styles.fieldLabel}>Date drafted</span>
              <span className={styles.autoDate}>
                {new Date(build.dateDrafted).toLocaleDateString()}
              </span>
            </div>
          )}
          {build.dateSigned && (
            <div className={styles.autoDateRow}>
              <span className={styles.fieldLabel}>Date signed</span>
              <span className={styles.autoDate}>
                {new Date(build.dateSigned).toLocaleDateString()}
              </span>
            </div>
          )}
          {build.dateFEC && (
            <div className={styles.autoDateRow}>
              <span className={styles.fieldLabel}>Date FEC</span>
              <span className={styles.autoDate}>
                {new Date(build.dateFEC).toLocaleDateString()}
              </span>
            </div>
          )}
          <FieldRow
            label="Livestream"
            field="livestream"
            value={build.livestream}
            options={BASE_STATUS}
            onChange={setField}
          />
          <FieldRow
            label="Workbook"
            field="workbook"
            value={build.workbook}
            options={BASE_STATUS}
            onChange={setField}
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
