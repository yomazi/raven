import * as Tabs from "@radix-ui/react-tabs";
import ChecklistIcon from "@svg/checklist_google.svg?react";
import ContactsIcon from "@svg/contacts_google.svg?react";
import RosterIcon from "@svg/roster_google.svg?react";
import ScheduleIcon from "@svg/schedule_google.svg?react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Switcher.module.css";

const Switcher = () => {
  const location = useLocation();

  // Determine the active tab based on the current URL path
  const currentPath = location.pathname.split("/")[1] || "roster";

  const views = [
    { id: "contacts", route: "/contacts", label: "Contacts", icon: <ContactsIcon /> },
    { id: "roster", route: "/roster/", label: "Roster", icon: <RosterIcon /> },
    { id: "tasks", route: "/tasks/", label: "Tasks", icon: <ChecklistIcon /> },
    { id: "schedules", route: "/schedules", label: "Schedules", icon: <ScheduleIcon /> },
  ];

  return (
    <Tabs.Root className={styles.tabsRoot} value={currentPath}>
      <Tabs.List className={styles.tabsList} aria-label="Manage your views">
        {views.map((view) => (
          <Tabs.Trigger
            key={view.id}
            value={view.id}
            asChild // Critical: lets NavLink handle the tag while Tabs handles state
          >
            <NavLink to={view.route} className={styles.tabsTrigger}>
              <span className={styles.iconWrapper}>{view.icon}</span>
              <span className={styles.label}>{view.label}</span>
            </NavLink>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
};

export default Switcher;
