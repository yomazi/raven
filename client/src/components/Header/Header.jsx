import styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <article className={styles.app_info}>
        <img src="/icons/raven-logo.png" alt="Raven Logo" className={styles.app_logo} />
        <div className={styles.app_title}>raven</div>
      </article>
      <img src="/icons/rg-icon.png" alt="RG Logo" className={styles.rg_icon} />
    </header>
  );
};

export default Header;
