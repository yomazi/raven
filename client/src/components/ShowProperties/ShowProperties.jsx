import { useRef } from "react";
import { useShowById } from "../../hooks/useShowById.js";
import { useShowProperties } from "../../hooks/useShowProperties.js";
import BillingSection from "./sections/BillingSection.jsx";
import ContactSection from "./sections/ContactSection.jsx";
import CoreSection from "./sections/CoreSection.jsx";
import DriveSection from "./sections/DriveSection.jsx";
import MarketingAssetsSection from "./sections/MarketingAssetsSection.jsx";
import OfferSection from "./sections/OfferSection.jsx";
import OtherSection from "./sections/OtherSection.jsx";
import PerformancesSection from "./sections/PerformancesSection.jsx";
import ProductionSection from "./sections/ProductionSection.jsx";
import ScheduleSection from "./sections/ScheduleSection.jsx";
import SetLengthSection from "./sections/SetLengthSection.jsx";
import TermsSection from "./sections/TermsSection.jsx";
import TicketPricesSection from "./sections/TicketPricesSection.jsx";
import styles from "./ShowProperties.module.css";
import ValidationPane from "./ValidationPane/ValidationPane.jsx";

const SECTIONS = [
  { id: "core", label: "Core" },
  { id: "billing", label: "Billing" },
  { id: "performances", label: "Performances" },
  { id: "set-length", label: "Set Length" },
  { id: "contact", label: "Contact" },
  { id: "offer", label: "Offer" },
  { id: "schedule", label: "Schedule" },
  { id: "ticket-prices", label: "Ticket Prices" },
  { id: "terms", label: "Terms" },
  { id: "marketing-assets", label: "Marketing Assets" },
  { id: "production", label: "Production" },
  { id: "drive", label: "Drive" },
  { id: "other", label: "Other" },
];

export default function ShowProperties({ showFolderId }) {
  const { data: show } = useShowById(showFolderId);
  const { form, setField, save, isPending } = useShowProperties(show);
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
      <div className={styles.content}>
        <div ref={(el) => (sectionRefs.current.core = el)}>
          <CoreSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.billing = el)}>
          <BillingSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.performances = el)}>
          <PerformancesSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["set-length"] = el)}>
          <SetLengthSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.contact = el)}>
          <ContactSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.offer = el)}>
          <OfferSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.schedule = el)}>
          <ScheduleSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["ticket-prices"] = el)}>
          <TicketPricesSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.terms = el)}>
          <TermsSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current["marketing-assets"] = el)}>
          <MarketingAssetsSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.production = el)}>
          <ProductionSection show={form} setField={setField} />
        </div>
        <div ref={(el) => (sectionRefs.current.drive = el)}>
          <DriveSection show={form} />
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
      />
    </div>
  );
}
