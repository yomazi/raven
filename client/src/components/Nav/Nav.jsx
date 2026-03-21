import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { NavLink } from "react-router-dom";
import { useSyncShows } from "../../hooks/useSyncShows.js";
import styles from "./Nav.module.css";

const Nav = () => {
  const { mutate: sync } = useSyncShows();

  return (
    <NavigationMenu.Root className={styles.navRoot}>
      <NavigationMenu.List className={styles.navList}>
        <NavigationMenu.Item className={styles.navItem}>
          <NavigationMenu.Trigger className={styles.navTrigger}>Drive</NavigationMenu.Trigger>
          <NavigationMenu.Content className={styles.navContent}>
            <ul className={styles.navDropdownList}>
              <li>
                <button className={styles.navDropdownButton} onClick={() => sync()}>
                  Sync from Drive
                </button>
              </li>
              <li className={styles.navSeparator} />
              <li>
                <button className={styles.navDropdownButton}>Create a New Show Folder</button>
              </li>
              <li className={styles.navSeparator} />
              <li>
                <button className={styles.navDropdownButton}>Create Settlement Workbook</button>
              </li>
              <li>
                <button className={styles.navDropdownButton}>Create Marketing Assets Folder</button>
              </li>
              <li className={styles.navSeparator} />
              <li>
                <button className={styles.navDropdownButton}>Generate Contract</button>
              </li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item className={styles.navItem}>
          <NavigationMenu.Trigger className={styles.navTrigger}>Options</NavigationMenu.Trigger>
          <NavigationMenu.Content className={styles.navContent}>
            <ul className={styles.navDropdownList}>
              <li>
                <button className={styles.navDropdownButton}>Current Shows Only</button>
              </li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      {/* No Viewport */}
    </NavigationMenu.Root>
  );
};

export default Nav;
