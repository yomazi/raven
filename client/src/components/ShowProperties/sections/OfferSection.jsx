import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const toDateString = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
};

export default function OfferSection({ show, setField }) {
  return (
    <section id="offer" className={styles.section}>
      <SectionHeader title="Offer" />
      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="offer-date">
          Offer Date
        </label>
        <input
          id="offer-date"
          className={styles.input}
          type="date"
          value={toDateString(show.offer?.date)}
          onChange={(e) => setField("offer.date", e.target.value ? new Date(e.target.value) : null)}
        />

        <label className={styles.label} htmlFor="offer-expiration">
          Expiration
        </label>
        <input
          id="offer-expiration"
          className={styles.input}
          type="date"
          value={toDateString(show.offer?.expiration)}
          onChange={(e) =>
            setField("offer.expiration", e.target.value ? new Date(e.target.value) : null)
          }
        />
      </div>
    </section>
  );
}
