import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const HOSPITALITY_TYPES = ["light", "normal", "heavy", "see rider", "none"];
const BACKLINE_TYPES = ["no", "if needed", "yes", "in house", "buyout"];
const MERCH_CUTS = ["no merch commission", "85% artist / 15% venue"];

const NumberField = ({ label, id, value, onChange, min = 0, step = 1 }) => (
  <>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className={styles.input}
      type="number"
      min={min}
      step={step}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  </>
);

export default function ProductionSection({ show, setField }) {
  const prod = show.production ?? {};

  return (
    <section id="production" className={styles.section}>
      <SectionHeader title="Production" />

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Hospitality</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="hosp-type">
            Type
          </label>
          <select
            id="hosp-type"
            className={styles.select}
            value={prod.hospitality?.hospitalityType ?? ""}
            onChange={(e) => {
              setField("production.hospitality.hospitalityType", e.target.value || null);
            }}
          >
            <option value="">— select —</option>
            {HOSPITALITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <NumberField
            label="Total Buyout ($)"
            id="hosp-buyout"
            value={prod.hospitality?.totalBuyout}
            onChange={(v) => setField("production.hospitality.totalBuyout", v)}
            step={0.01}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Meals</h4>
        <div className={styles.fieldGrid}>
          <NumberField
            label="# People"
            id="meals-people"
            value={prod.meals?.numPeople}
            onChange={(v) => setField("production.meals.numPeople", v)}
          />
          <NumberField
            label="# Days"
            id="meals-days"
            value={prod.meals?.numDays}
            onChange={(v) => setField("production.meals.numDays", v)}
          />
          <NumberField
            label="$ / Person"
            id="meals-per-person"
            value={prod.meals?.dollarsPerPerson}
            onChange={(v) => setField("production.meals.dollarsPerPerson", v)}
            step={0.01}
          />
          <NumberField
            label="Total Buyout ($)"
            id="meals-buyout"
            value={prod.meals?.totalBuyout}
            onChange={(v) => setField("production.meals.totalBuyout", v)}
            step={0.01}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Accommodations</h4>
        <div className={styles.fieldGrid}>
          <NumberField
            label="# Rooms"
            id="accomm-rooms"
            value={prod.accommodations?.numRooms}
            onChange={(v) => setField("production.accommodations.numRooms", v)}
          />
          <NumberField
            label="# Nights"
            id="accomm-nights"
            value={prod.accommodations?.numNights}
            onChange={(v) => setField("production.accommodations.numNights", v)}
          />
          <NumberField
            label="Total Buyout ($)"
            id="accomm-buyout"
            value={prod.accommodations?.totalBuyout}
            onChange={(v) => setField("production.accommodations.totalBuyout", v)}
            step={0.01}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Travel</h4>
        <div className={styles.fieldGrid}>
          <NumberField
            label="Total Buyout ($)"
            id="travel-buyout"
            value={prod.travel?.totalBuyout}
            onChange={(v) => setField("production.travel.totalBuyout", v)}
            step={0.01}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Backline</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="backline-type">
            Type
          </label>
          <select
            id="backline-type"
            className={styles.select}
            value={prod.backline?.backlineType ?? ""}
            onChange={(e) => {
              setField("production.backline.backlineType", e.target.value || null);
            }}
          >
            <option value="">— select —</option>
            {BACKLINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <NumberField
            label="Total Buyout ($)"
            id="backline-buyout"
            value={prod.backline?.totalBuyout}
            onChange={(v) => setField("production.backline.totalBuyout", v)}
            step={0.01}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Other</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.label} htmlFor="merch-cut">
            Merch Cut
          </label>
          <select
            id="merch-cut"
            className={styles.select}
            value={prod.merchCut ?? "no merch commission"}
            onChange={(e) => {
              setField("production.merchCut", e.target.value);
            }}
          >
            {MERCH_CUTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <NumberField
            label="Guest List Comps"
            id="guest-list-comps"
            value={prod.numGuestListComps}
            onChange={(v) => setField("production.numGuestListComps", v)}
          />
        </div>
      </div>
    </section>
  );
}
