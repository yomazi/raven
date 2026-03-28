import ChecklistIcon from "@svg/checklist_google.svg?react";
import ConstructionIcon from "@svg/construction_google.svg?react";
import EventIcon from "@svg/events_google.svg?react";
import { NavLink } from "react-router-dom";
import styles from "./Switcher.module.css";

const Switcher = ({ mode }) => {
  const icons = [
    {
      id: "events",
      route: "/shows/default/",
      caption: "Shows",
      component: <EventIcon className={styles.icon} />,
    },
    {
      id: "tasks",
      route: "/tasks/",
      caption: "Tasks",
      component: <ChecklistIcon className={styles.icon} />,
    },
    {
      id: "builds",
      route: "/builds/",
      caption: "Builds",
      component: <ConstructionIcon className={styles.icon} />,
    },
  ];

  return (
    <section className={styles.switcher}>
      {icons.map((icon) => {
        return (
          <NavLink
            to={icon.route}
            key={icon.id}
            className={`${styles.iconContainer} ${mode === icon.id ? styles.active : ""}`}
          >
            {icon.component}
            <div className={styles.caption}>{icon.caption}</div>
          </NavLink>
        );
      })}
    </section>
  );
};

export default Switcher;
