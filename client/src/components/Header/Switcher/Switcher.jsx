import * as Tabs from "@radix-ui/react-tabs";
import ChecklistIcon from "@svg/checklist_google.svg?react";
import ConstructionIcon from "@svg/construction_google.svg?react";
import EventIcon from "@svg/events_google.svg?react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Switcher.module.css";

const Switcher = () => {
  const location = useLocation();

  // Determine the active tab based on the current URL path
  const currentPath = location.pathname.split("/")[1] || "events";

  const views = [
    { id: "shows", route: "/shows/default/", label: "Shows", icon: <EventIcon /> },
    { id: "tasks", route: "/tasks/", label: "Tasks", icon: <ChecklistIcon /> },
    { id: "builds", route: "/builds/", label: "Builds", icon: <ConstructionIcon /> },
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
