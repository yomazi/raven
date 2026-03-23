import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

export default function ContactSection({ show, setField }) {
  const contacts = show.contact ?? [];

  const updateContact = (index, field, value) => {
    const updated = contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    setField("contact", updated);
  };

  const addContact = () => {
    setField("contact", [...contacts, { name: "", info: "" }]);
  };

  const removeContact = (index) => {
    setField(
      "contact",
      contacts.filter((_, i) => i !== index)
    );
  };

  return (
    <section id="contact" className={styles.section}>
      <SectionHeader title="Contact" />

      {contacts.length === 0 && <p className={styles.empty}>No contacts defined.</p>}

      {contacts.map((contact, i) => (
        <div key={i} className={styles.subSection}>
          <div className={styles.subSectionTitleRow}>
            <h4 className={styles.subSectionTitle}>Contact {i + 1}</h4>
            <button className={styles.removeButton} onClick={() => removeContact(i)}>
              Remove
            </button>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.label} htmlFor={`contact-name-${i}`}>
              Name
            </label>
            <input
              id={`contact-name-${i}`}
              className={styles.input}
              type="text"
              value={contact.name ?? ""}
              onChange={(e) => updateContact(i, "name", e.target.value)}
            />

            <label className={styles.label} htmlFor={`contact-info-${i}`}>
              Email / Phone
            </label>
            <input
              id={`contact-info-${i}`}
              className={styles.input}
              type="text"
              value={contact.info ?? ""}
              onChange={(e) => updateContact(i, "info", e.target.value)}
            />
          </div>
        </div>
      ))}

      <button className={styles.addButton} onClick={addContact}>
        + Add Contact
      </button>
    </section>
  );
}
