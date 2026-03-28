import RgIcon from "@svg/rg.svg?react";
import { useAuthStatus } from "../../hooks/useAuthStatus";
import styles from "./Header.module.css";
import Switcher from "./Switcher/Switcher";

const Header = ({ mode }) => {
  const { loggedIn, logout } = useAuthStatus();

  const handleLogin = () => {
    window.location.href = "/auth/google"; // starts OAuth flow
  };

  return (
    <header className={styles.header}>
      <article className={styles.appInfo}>
        <div className={styles.appLogo}>
          <img src="/icons/raven-logo.png" alt="Raven Logo" className={styles.appLogo} />
        </div>
        <p className={styles.appTitle}>raven</p>
      </article>
      <Switcher mode={mode} />
      <article className={styles.appControls}>
        {loggedIn ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <button onClick={handleLogin}>Login with Google</button>
        )}
        <div className={styles.rgIconContainer}>
          <RgIcon alt="RG Logo" className={styles.rgIcon} />
        </div>
      </article>
    </header>
  );
};

export default Header;
