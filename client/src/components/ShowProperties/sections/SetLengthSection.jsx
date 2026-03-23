import { useState } from "react";
import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const SET_LENGTH_OPTIONS = ["1 x 90 minute set", "2 x 45 minute sets w/ intermission"];

export default function SetLengthSection({ show, setField }) {
  const setLength = show.misc?.setLength ?? "";
  const isKnownOption = SET_LENGTH_OPTIONS.includes(setLength);
  const [showCustom, setShowCustom] = useState(!isKnownOption && setLength !== "");

  const selectValue = showCustom ? "other" : setLength;

  return (
    <section id="set-length" className={styles.section}>
      <SectionHeader title="Set Length" />
      <div className={styles.fieldGrid}>
        <label className={styles.label} htmlFor="set-length-select">
          Set Length
        </label>
        <select
          id="set-length-select"
          className={styles.select}
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "other") {
              setShowCustom(true);
              setField("misc.setLength", "");
            } else {
              setShowCustom(false);
              setField("misc.setLength", e.target.value);
            }
          }}
        >
          <option value="">— select —</option>
          {SET_LENGTH_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="other">other…</option>
        </select>

        {showCustom && (
          <>
            <label className={styles.label} htmlFor="set-length-custom">
              Custom
            </label>
            <input
              id="set-length-custom"
              className={styles.input}
              type="text"
              value={setLength}
              onChange={(e) => setField("misc.setLength", e.target.value)}
              autoFocus
            />
          </>
        )}
      </div>
    </section>
  );
}
