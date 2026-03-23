import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const BACKEND_TYPES = ["none", "plus", "vs"];

const BackendFields = ({ prefix, values, setField }) => {
  const hasBackend = values?.backendType && values.backendType !== "none";

  return (
    <>
      <label className={styles.label} htmlFor={`${prefix}-guarantee`}>
        Guarantee ($)
      </label>
      <input
        id={`${prefix}-guarantee`}
        className={styles.input}
        type="number"
        min="0"
        step="0.01"
        value={values?.guarantee ?? ""}
        onChange={(e) =>
          setField(`${prefix}.guarantee`, e.target.value === "" ? null : Number(e.target.value))
        }
      />

      <label className={styles.label} htmlFor={`${prefix}-backendType`}>
        Backend Type
      </label>
      <select
        id={`${prefix}-backendType`}
        className={styles.select}
        value={values?.backendType ?? "none"}
        onChange={(e) => {
          setField(`${prefix}.backendType`, e.target.value);
          if (e.target.value === "none") {
            setField(`${prefix}.percentage`, 0);
            setField(`${prefix}.splitPoint`, null);
          }
        }}
      >
        {BACKEND_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {hasBackend && (
        <>
          <label className={styles.label} htmlFor={`${prefix}-percentage`}>
            Percentage (%)
          </label>
          <input
            id={`${prefix}-percentage`}
            className={styles.input}
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={values?.percentage ?? ""}
            onChange={(e) =>
              setField(
                `${prefix}.percentage`,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />

          <label className={styles.label} htmlFor={`${prefix}-splitPoint`}>
            Split Point ($)
          </label>
          <input
            id={`${prefix}-splitPoint`}
            className={styles.input}
            type="number"
            min="0.01"
            step="0.01"
            value={values?.splitPoint ?? ""}
            onChange={(e) =>
              setField(
                `${prefix}.splitPoint`,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </>
      )}
    </>
  );
};

export default function TermsSection({ show, setField }) {
  const terms = show.terms ?? {};
  const hasLivestream = terms.livestream?.hasLivestream ?? false;

  return (
    <section id="terms" className={styles.section}>
      <SectionHeader title="Terms" />

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Main Settlement</h4>
        <div className={styles.fieldGrid}>
          <BackendFields prefix="terms.main" values={terms.main} setField={setField} />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Livestream</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="livestream-enabled">
            Has Livestream
          </label>
          <input
            id="livestream-enabled"
            type="checkbox"
            className={styles.checkbox}
            checked={hasLivestream}
            onChange={(e) => {
              setField("terms.livestream.hasLivestream", e.target.checked);
            }}
          />

          {hasLivestream && (
            <>
              <label className={styles.label} htmlFor="livestream-ticket-price">
                Ticket Price ($)
              </label>
              <input
                id="livestream-ticket-price"
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={terms.livestream?.ticketPrice ?? ""}
                onChange={(e) =>
                  setField(
                    "terms.livestream.ticketPrice",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
              <BackendFields
                prefix="terms.livestream"
                values={terms.livestream}
                setField={setField}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Educational Events</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="edu-description">
            Description
          </label>
          <textarea
            id="edu-description"
            className={styles.textarea}
            value={terms.educationalEvents?.description ?? ""}
            onChange={(e) => setField("terms.educationalEvents.description", e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </section>
  );
}
