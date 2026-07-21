import RgIcon from "@svg/rg.svg?react";
import { Link } from "react-router-dom";
import { useAuthStatus } from "../../hooks/useAuthStatus";
import ApiTokensButton from "./ApiTokensButton/ApiTokensButton.jsx";
import styles from "./Header.module.css";
import SettingsButton from "./SettingsButton/SettingsButton.jsx";
import Switcher from "./Switcher/Switcher";

const Header = ({ mode }) => {
  const { loggedIn, hasLocalSession, logout } = useAuthStatus();

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
          <>
            <SettingsButton />
            <ApiTokensButton />
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <button onClick={handleLogin}>Login with Google</button>
        )}
        {/* Only shown when this browser's own session is actually broken
            (checked separately from loggedIn, which reflects the app-wide
            Google grant and is essentially always true) — e.g. a new
            device/browser or cleared cookies. Hidden during normal use. */}
        {!hasLocalSession && (
          <Link to="/token-login" className={styles.tokenLoginLink}>
            Sign in with token
          </Link>
        )}
        <div className={styles.rgIconContainer}>
          <RgIcon alt="RG Logo" className={styles.rgIcon} />
        </div>
      </article>
    </header>
  );
};

export default Header;
