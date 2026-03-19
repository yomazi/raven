import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { NavLink } from "react-router-dom";
import styles from "./Nav.module.css";

const Nav = () => {
  return (
    <NavigationMenu.Root className={styles.navRoot}>
      <NavigationMenu.List className={styles.navList}>
        {/* Simple link item */}
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild>
            <NavLink to="/" className={styles.navLink}>
              Home
            </NavLink>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        {/* Dropdown item */}
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

        {/* Another dropdown */}
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={styles.navTrigger}>Data</NavigationMenu.Trigger>
          <NavigationMenu.Content className={styles.navContent}>
            <ul className={styles.navDropdownList}>
              <li>
                <NavigationMenu.Link asChild>
                  <NavLink to="/sync" className={styles.navDropdownLink}>
                    Sync from Drive
                  </NavLink>
                </NavigationMenu.Link>
              </li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      {/* Radix renders the dropdown content here, outside the list flow */}
      <NavigationMenu.Viewport className={styles.navViewport} />
    </NavigationMenu.Root>
  );
};

export default Nav;
