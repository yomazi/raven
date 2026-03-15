import { useAuthStatus } from "../../hooks/useAuthStatus";
import styles from "./Header.module.css";

const Header = () => {
  const { loggedIn, logout } = useAuthStatus();

  const handleLogin = () => {
    window.location.href = "/auth/google"; // starts OAuth flow
  };

  return (
    <header className={styles.header}>
      <article className={styles.appInfo}>
        <img src="/icons/raven-logo.png" alt="Raven Logo" className={styles.appLogo} />
        <div className={styles.appTitle}>raven</div>
      </article>
      <article className={styles.appControls}>
        {loggedIn ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <button onClick={handleLogin}>Login with Google</button>
        )}
        <img src="/icons/rg-icon.png" alt="RG Logo" className={styles.rgIcon} />
      </article>
    </header>
  );
};

export default Header;
