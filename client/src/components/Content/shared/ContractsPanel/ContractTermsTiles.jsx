// client/src/components/Content/shared/ContractsPanel/ContractTermsTiles.jsx
//
// Renders FIELD_SECTIONS as full-width, vertically stacked tiles — each
// with its own Apply/Save button. Shared between ParseContractModal
// (compares parsed data against what's currently on the contract) and
// ContractTermsModal (edits the contract's live values directly, no
// comparison needed).

import SvgSave from "@svg/save_google.svg?react";
import { FIELD_SECTIONS, getAtPath } from "./contractTermsFields.js";
import styles from "./ContractTermsTiles.module.css";

function formatCurrentValue(field, value) {
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "percent") {
    return value !== null && value !== undefined && value !== "" ? `${value}%` : "—";
  }
  if (field.type === "currency") {
    return value !== null && value !== undefined && value !== "" ? `$${value}` : "—";
  }
  return value ?? "—";
}

function FieldControl({ field, value, onChange }) {
  if (field.type === "enum") {
    return (
      <select
        className={styles.select}
        value={value ?? field.default ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        {!field.options.includes(value ?? field.default) && <option value="">—</option>}
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (field.type === "percent") {
    return (
      <div className={styles.percentWrap}>
        <input
          className={styles.input}
          type="text"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.percentSuffix}>%</span>
      </div>
    );
  }

  if (field.type === "currency") {
    return (
      <div className={styles.currencyWrap}>
        <span className={styles.currencyPrefix}>$</span>
        <input
          className={styles.input}
          type="text"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <input
        className={styles.input}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    );
  }

  return (
    <input
      className={styles.input}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Whether a section's collapsible rows (e.g. Livestream's fields beyond the
// checkbox) should be expanded — true if either the edited draft or the
// current contract value has showFieldsWhenTrue's flag set.
function isExpanded(section, values, currentValues) {
  if (!section.showFieldsWhenTrue) return true;
  return !!(values?.[section.showFieldsWhenTrue] || currentValues?.[section.showFieldsWhenTrue]);
}

// A grid shared across every row passed in, with each field pinned to its
// row's column index — so e.g. Ticket Price (row 1, col 2) lines up with
// Backend Type (row 2, col 2) instead of each row sizing independently.
function FieldGrid({ rows, fieldsByKey, section, values, currentValues, onFieldChange }) {
  const maxCols = Math.max(...rows.map((r) => r.length));
  return (
    <div className={styles.fieldsGrid} style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(150px, 1fr))` }}>
      {rows.flatMap((rowKeys, rowIdx) =>
        rowKeys.map((k, colIdx) => (
          <FieldItem
            key={`${rowIdx}-${k}`}
            f={fieldsByKey[k]}
            section={section}
            values={values}
            currentValues={currentValues}
            onFieldChange={onFieldChange}
            className={styles.gridField}
            style={{ gridColumn: colIdx + 1 }}
          />
        ))
      )}
    </div>
  );
}

function FieldItem({ f, section, values, currentValues, onFieldChange, className, style }) {
  const isBoolean = f.type === "boolean";
  return (
    <label className={className} style={style}>
      {!isBoolean && <span className={styles.fieldLabel}>{f.label}</span>}
      {isBoolean ? (
        <div className={styles.checkboxRow}>
          <FieldControl
            field={f}
            value={values?.[f.key]}
            onChange={(v) => onFieldChange(section.path, f.key, v)}
          />
          <span className={styles.fieldLabel}>{f.label}</span>
        </div>
      ) : (
        <FieldControl
          field={f}
          value={values?.[f.key]}
          onChange={(v) => onFieldChange(section.path, f.key, v)}
        />
      )}
      {currentValues && (
        <span className={styles.currentValue}>
          Currently on contract: {formatCurrentValue(f, currentValues?.[f.key])}
        </span>
      )}
    </label>
  );
}

/**
 * Props:
 *   data            object to read editable values from, same nested shape
 *                   as FIELD_SECTIONS paths (extracted parse fields, or an
 *                   edit draft copied from the contract)
 *   current         object to show as "Currently on contract: …" beside
 *                   each field, or null/undefined to hide that comparison
 *   onFieldChange   (path, key, value) => void
 *   onApplySection  (section) => void
 *   appliedPaths    Set<string> of path keys that saved successfully
 *   isSaving        boolean — true while any section is saving (disables all buttons)
 *   showApplyButtons  false to hide the per-tile save button entirely, for
 *                     callers that save every section at once instead
 */
export default function ContractTermsTiles({
  data,
  current = null,
  onFieldChange,
  onApplySection,
  appliedPaths,
  isSaving,
  showApplyButtons = true,
}) {
  return (
    <div className={styles.tiles}>
      {FIELD_SECTIONS.map((section) => {
        const values = getAtPath(data, section.path);
        const currentValues = current ? getAtPath(current, section.path) : null;
        const pathKey = section.path.join(".");
        const isThisApplied = appliedPaths?.has(pathKey);
        const fieldsByKey = Object.fromEntries(section.fields.map((f) => [f.key, f]));
        return (
          <div key={section.title} className={styles.tileRow}>
            <div className={styles.tile}>
              <span className={styles.tileTitle}>{section.title}</span>
              {section.collapsibleRows ? (
                <>
                  <div className={styles.fieldsRow}>
                    {section.alwaysVisibleKeys.map((k) => (
                      <FieldItem
                        key={k}
                        f={fieldsByKey[k]}
                        section={section}
                        values={values}
                        currentValues={currentValues}
                        onFieldChange={onFieldChange}
                        className={styles.field}
                      />
                    ))}
                  </div>
                  <div
                    className={styles.collapse}
                    data-expanded={isExpanded(section, values, currentValues)}
                  >
                    <div className={styles.collapseInner}>
                      <FieldGrid
                        rows={section.collapsibleRows}
                        fieldsByKey={fieldsByKey}
                        section={section}
                        values={values}
                        currentValues={currentValues}
                        onFieldChange={onFieldChange}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.fieldsRow}>
                  {section.fields.map((f) => (
                    <FieldItem
                      key={f.key}
                      f={f}
                      section={section}
                      values={values}
                      currentValues={currentValues}
                      onFieldChange={onFieldChange}
                      className={styles.field}
                    />
                  ))}
                </div>
              )}
            </div>
            {showApplyButtons && (
              <button
                className={styles.sideButton}
                onClick={() => onApplySection(section)}
                disabled={isSaving || isThisApplied}
                aria-label={isThisApplied ? "Saved" : "Save"}
              >
                <SvgSave className={styles.sideButtonIcon} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
