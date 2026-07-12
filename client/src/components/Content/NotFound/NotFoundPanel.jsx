import { Link, useLocation } from "react-router-dom";
import styles from "./NotFoundPanel.module.css";

export default function NotFoundPanel() {
  const location = useLocation();

  return (
    <div className={styles.root}>
      <img src="/icons/raven-logo.png" alt="" className={styles.logo} />
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>
        Nothing's nesting at <code className={styles.path}>{location.pathname}</code>.
      </p>
      <Link to="/roster" className={styles.homeLink}>
        Back to Roster
      </Link>
    </div>
  );
}
