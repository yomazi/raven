import { NavLink } from "react-router-dom";
import ChecklistIcon from "../../../assets/svg/checklist_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import EventIcon from "../../../assets/svg/event_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import HandymanIcon from "../../../assets/svg/handyman_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
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
      component: <HandymanIcon className={styles.icon} />,
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
