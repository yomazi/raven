import { useAuthStatus } from "../../hooks/useAuthStatus";
import styles from "./Header.module.css";

const Header = () => {
  const { loggedIn, logout } = useAuthStatus();

  const handleLogin = () => {
    window.location.href = "/auth/google"; // starts OAuth flow
  };

  return (
    <header className={styles.header}>
      <article className={styles.app_info}>
        <img src="/icons/raven-logo.png" alt="Raven Logo" className={styles.app_logo} />
        <div className={styles.app_title}>raven</div>
      </article>
      <article className={styles.app_controls}>
        {loggedIn ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <button onClick={handleLogin}>Login with Google</button>
        )}
        <img src="/icons/rg-icon.png" alt="RG Logo" className={styles.rg_icon} />
      </article>
    </header>
  );
};

export default Header;
