import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const PriceField = ({ label, id, value, onChange }) => (
  <>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className={styles.input}
      type="number"
      min="0"
      step="0.01"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  </>
);

export default function TicketPricesSection({ show, setField }) {
  const tp = show.ticketPrices ?? {};
  const tiers = tp.slidingScaleTiers ?? [];

  const updateTier = (index, field, value) => {
    const updated = tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    setField("ticketPrices.slidingScaleTiers", updated);
  };

  const addTier = () => {
    setField("ticketPrices.slidingScaleTiers", [...tiers, { name: "", min: null }]);
  };

  const removeTier = (index) => {
    setField(
      "ticketPrices.slidingScaleTiers",
      tiers.filter((_, i) => i !== index)
    );
  };

  return (
    <section id="ticket-prices" className={styles.section}>
      <SectionHeader title="Ticket Prices" />

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>General Admission</h4>
        <div className={styles.fieldGrid}>
          <PriceField
            label="Advance"
            id="ga-advance"
            value={tp.ga?.advance}
            onChange={(v) => setField("ticketPrices.ga.advance", v)}
          />
          <PriceField
            label="Day of Show"
            id="ga-dos"
            value={tp.ga?.dos}
            onChange={(v) => setField("ticketPrices.ga.dos", v)}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>Premium</h4>
        <div className={styles.fieldGrid}>
          <PriceField
            label="Advance"
            id="premium-advance"
            value={tp.premium?.advance}
            onChange={(v) => setField("ticketPrices.premium.advance", v)}
          />
          <PriceField
            label="Day of Show"
            id="premium-dos"
            value={tp.premium?.dos}
            onChange={(v) => setField("ticketPrices.premium.dos", v)}
          />
        </div>
      </div>

      <div className={styles.subSection}>
        <h4 className={styles.subSectionTitle}>VIP</h4>
        <div className={styles.fieldGrid}>
          <PriceField
            label="Advance"
            id="vip-advance"
            value={tp.vip?.advance}
            onChange={(v) => setField("ticketPrices.vip.advance", v)}
          />
          <PriceField
            label="Day of Show"
            id="vip-dos"
            value={tp.vip?.dos}
            onChange={(v) => setField("ticketPrices.vip.dos", v)}
          />
        </div>
      </div>

      {tiers.length > 0 && (
        <div className={styles.subSection}>
          <h4 className={styles.subSectionTitle}>Sliding Scale Tiers</h4>
          {tiers.map((tier, i) => (
            <div key={i} className={styles.subSection}>
              <div className={styles.subSectionTitleRow}>
                <h4 className={styles.subSectionTitle}>Tier {i + 1}</h4>
                <button className={styles.removeButton} onClick={() => removeTier(i)}>
                  Remove
                </button>
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.label} htmlFor={`tier-name-${i}`}>
                  Name
                </label>
                <input
                  id={`tier-name-${i}`}
                  className={styles.input}
                  type="text"
                  value={tier.name ?? ""}
                  onChange={(e) => updateTier(i, "name", e.target.value)}
                />
                <label className={styles.label} htmlFor={`tier-min-${i}`}>
                  Minimum ($)
                </label>
                <input
                  id={`tier-min-${i}`}
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.min ?? ""}
                  onChange={(e) =>
                    updateTier(i, "min", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.addButton} onClick={addTier}>
        + Add Sliding Scale Tier
      </button>

      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="tp-details">
          Details
        </label>
        <textarea
          id="tp-details"
          className={styles.textarea}
          value={tp.details ?? ""}
          onChange={(e) => setField("ticketPrices.details", e.target.value)}
          rows={3}
        />
      </div>
    </section>
  );
}
