import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

export default function BillingSection({ show, setField }) {
  return (
    <section id="billing" className={styles.section}>
      <SectionHeader title="Billing" />
      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="billing-main">
          Main Billing
        </label>
        <input
          id="billing-main"
          className={styles.input}
          type="text"
          value={show.billing?.main ?? ""}
          onChange={(e) => setField("billing.main", e.target.value)}
        />

        <label className={styles.label} htmlFor="billing-sub1">
          Sub-billing 1
        </label>
        <input
          id="billing-sub1"
          className={styles.input}
          type="text"
          value={show.billing?.sub1 ?? ""}
          onChange={(e) => setField("billing.sub1", e.target.value)}
        />

        <label className={styles.label} htmlFor="billing-sub2">
          Sub-billing 2
        </label>
        <input
          id="billing-sub2"
          className={styles.input}
          type="text"
          value={show.billing?.sub2 ?? ""}
          onChange={(e) => setField("billing.sub2", e.target.value)}
        />
      </div>
    </section>
  );
}
