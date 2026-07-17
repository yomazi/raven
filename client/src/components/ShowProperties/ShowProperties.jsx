import ScheduleSection from "@components/Content/shared/ScheduleSection/ScheduleSection.jsx";
import { useShowSchedule } from "@hooks/useShowSchedule.js";
import { useRef } from "react";
import { useShowById } from "../../hooks/useShowById.js";
import { useShowProperties } from "../../hooks/useShowProperties.js";
import BillingSection from "./sections/BillingSection.jsx";
import ContactSection from "./sections/ContactSection.jsx";
import CoreSection from "./sections/CoreSection.jsx";
import MarketingAssetsSection from "./sections/MarketingAssetsSection.jsx";
import OtherSection from "./sections/OtherSection.jsx";
import PerformancesSection from "./sections/PerformancesSection.jsx";
import ProductionSection from "./sections/ProductionSection.jsx";
import sectionStyles from "./sections/Section.module.css";
import SectionHeader from "./sections/SectionHeader.jsx";
import SetLengthSection from "./sections/SetLengthSection.jsx";
import TermsSection from "./sections/TermsSection.jsx";
import TicketPricesSection from "./sections/TicketPricesSection.jsx";
import styles from "./ShowProperties.module.css";
import ValidationPane from "./ValidationPane/ValidationPane.jsx";

const SECTIONS = [
  { id: "core", label: "Core" },
  { id: "schedule", label: "Schedule" },
  { id: "performances", label: "Performances" },
  { id: "terms", label: "Deal Terms" },
  { id: "set-length", label: "Set Length" },
  { id: "contact", label: "Contact List" },
  { id: "ticket-prices", label: "Ticket Prices" },
  { id: "production", label: "Production" },
  { id: "billing", label: "Billing" },
  { id: "marketing-assets", label: "Marketing Assets" },
  { id: "other", label: "Other" },
];

export default function ShowProperties({ showFolderId }) {
  const { data: show } = useShowById(showFolderId);
  const { form, setField, save, isPending, isDirty } = useShowProperties(show);
  // Schedule is edited through the same hook/mechanism as the Build page —
  // it auto-saves immediately per field rather than being staged in `form`
  // and sent on the page's explicit Save (see useShowProperties.js's save(),
  // which excludes `schedule` from the whole-form patch for this reason).
  const {
    schedule,
    setField: setScheduleField,
    setReleaseMode,
    addPresale,
    updatePresale,
    removePresale,
  } = useShowSchedule(show);
  const sectionRefs = useRef({});
  const navRef = useRef(null);

  const scrollToSection = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!show) return null;

  return (
    <div className={styles.page}>
      {/* Side nav */}
      <nav className={styles.sideNav} ref={navRef}>
        <ul className={styles.navList}>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button className={styles.navLink} onClick={() => scrollToSection(s.id)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Scrollable content */}
      <div className={styles.content} data-dirty={isDirty}>
        <div ref={(el) => (sectionRefs.current.core = el)}>
          <CoreSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.schedule = el)}>
          <section id="schedule" className={sectionStyles.section}>
            <SectionHeader title="Schedule" />
            <ScheduleSection
              key={showFolderId}
              schedule={schedule}
              initialNotes={show?.schedule?.notes}
              setField={setScheduleField}
              setReleaseMode={setReleaseMode}
              addPresale={addPresale}
              updatePresale={updatePresale}
              removePresale={removePresale}
            />
          </section>
        </div>
        <div ref={(el) => (sectionRefs.current.performances = el)}>
          <PerformancesSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.terms = el)}>
          <TermsSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["set-length"] = el)}>
          <SetLengthSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.contact = el)}>
          <ContactSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["ticket-prices"] = el)}>
          <TicketPricesSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.production = el)}>
          <ProductionSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.billing = el)}>
          <BillingSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["marketing-assets"] = el)}>
          <MarketingAssetsSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.other = el)}>
          <OtherSection show={form} setField={setField} />
        </div>
      </div>
      {/* Validation pane */}
      <ValidationPane
        warnings={form.validation?.warnings ?? []}
        scrollToSection={scrollToSection}
        onSave={save}
        isPending={isPending}
        isDirty={isDirty}
      />
    </div>
  );
}
