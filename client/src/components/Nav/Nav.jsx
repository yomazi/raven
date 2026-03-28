import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useCreateMarketingAssetsFolder } from "../../hooks/useCreateMarketingAssetsFolder.js";
import { useCreateSettlementWorkbook } from "../../hooks/useCreateSettlementWorkbook.js";
import { useSyncShows } from "../../hooks/useSyncShows.js";
import useShowsStore from "../../store/useShowsStore.js";
import CreateShowModal from "../Modals/CreateShowModal/CreateShowModal.jsx";
import styles from "./Nav.module.css";

const Nav = () => {
  const { mutate: sync } = useSyncShows();
  const { mutate: createWorkbook } = useCreateSettlementWorkbook();
  const { mutate: createMarketingAssetsFolder } = useCreateMarketingAssetsFolder();
  const selectedShow = useShowsStore((s) => s.selectedShow);
  const [createShowOpen, setCreateShowOpen] = useState(false);
  const isSelectedShowVisible = useShowsStore((s) => s.isSelectedShowVisible);
  const gridWidth = useShowsStore((s) => s.gridWidth);
  const leftNavRef = useRef(null);
  const [leftNavWidth, setLeftNavWidth] = useState(0);
  const oneRem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const spacerWidth = Math.max(0, gridWidth - leftNavWidth - oneRem);

  useEffect(() => {
    if (!leftNavRef.current) return;
    const observer = new ResizeObserver(() => {
      setLeftNavWidth(leftNavRef.current.offsetWidth);
    });
    observer.observe(leftNavRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <NavigationMenu.Root className={styles.navRoot}>
        <NavigationMenu.List className={styles.navList}>
          <div ref={leftNavRef} className={styles.leftNavItems}>
            <NavigationMenu.Item className={styles.navItem}>
              <NavigationMenu.Trigger className={styles.navTrigger}>Drive</NavigationMenu.Trigger>
              <NavigationMenu.Content className={styles.navContent}>
                <ul className={styles.navDropdownList}>
                  <li>
                    <button
                      className={styles.navDropdownButton}
                      onClick={() => setCreateShowOpen(true)}
                    >
                      Create a New Show Folder
                    </button>
                  </li>
                  <li className={styles.navSeparator} />
                  <li>
                    <button className={styles.navDropdownButton} onClick={() => sync()}>
                      Sync from Drive
                    </button>
                  </li>
                </ul>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item className={styles.navItem}>
              <NavigationMenu.Trigger
                className={styles.navTrigger}
                disabled={!isSelectedShowVisible}
              >
                Content
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className={styles.navContent}>
                <ul className={styles.navDropdownList}>
                  <li>
                    <button
                      className={styles.navDropdownButton}
                      onClick={() =>
                        createWorkbook({ googleFolderId: selectedShow?.googleFolderId })
                      }
                    >
                      Create Settlement Workbook
                    </button>
                  </li>
                  <li>
                    <button
                      className={styles.navDropdownButton}
                      onClick={() =>
                        createMarketingAssetsFolder({
                          googleFolderId: selectedShow?.googleFolderId,
                        })
                      }
                    >
                      Create Marketing Assets Folder
                    </button>
                  </li>
                  <li className={styles.navSeparator} />
                  <li>
                    <button className={styles.navDropdownButton}>Generate Contract</button>
                  </li>
                </ul>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          </div>

          <div className={styles.navSpacer} style={{ width: spacerWidth }} />

          <NavigationMenu.Item className={styles.navItem}>
            <NavigationMenu.Link asChild>
              <NavLink
                to={`/shows/${selectedShow?.googleFolderId}/properties`}
                className={styles.navLink}
                aria-disabled={!isSelectedShowVisible}
              >
                Properties
              </NavLink>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>

      <CreateShowModal
        key={createShowOpen ? "open" : "closed"}
        open={createShowOpen}
        onOpenChange={setCreateShowOpen}
      />
    </>
  );
};

export default Nav;
