import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { NavLink } from "react-router-dom";
import { useSyncShows } from "../../hooks/useSyncShows.js";
import styles from "./Nav.module.css";

const Nav = () => {
  const { mutate: sync, isPending } = useSyncShows();

  return (
    <NavigationMenu.Root className={styles.navRoot}>
      <NavigationMenu.List className={styles.navList}>
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild>
            <NavLink to="/" className={styles.navLink}>
              Home
            </NavLink>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        {/* Show Folders dropdown — first, replaces Data */}
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={styles.navTrigger}>
            Show Folders
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className={styles.navContent}>
            <ul className={styles.navDropdownList}>
              <li>
                <button
                  className={styles.navDropdownLink}
                  onClick={() => sync()}
                  disabled={isPending}
                >
                  {isPending ? "Syncing…" : "Sync from Drive"}
                </button>
              </li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={styles.navTrigger}>Shows</NavigationMenu.Trigger>
          <NavigationMenu.Content className={styles.navContent}>
            <ul className={styles.navDropdownList}>
              <li>
                <NavigationMenu.Link asChild>
                  <NavLink to="/shows" className={styles.navDropdownLink}>
                    All Shows
                  </NavLink>
                </NavigationMenu.Link>
              </li>
              <li>
                <NavigationMenu.Link asChild>
                  <NavLink to="/shows/new" className={styles.navDropdownLink}>
                    New Show
                  </NavLink>
                </NavigationMenu.Link>
              </li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      <NavigationMenu.Viewport className={styles.navViewport} />
    </NavigationMenu.Root>
  );
};

export default Nav;
