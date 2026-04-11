import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { useCreateMarketingAssetsFolder } from "../../hooks/useCreateMarketingAssetsFolder.js";
import { useCreateSettlementWorkbook } from "../../hooks/useCreateSettlementWorkbook.js";
import { useSyncShows } from "../../hooks/useSyncShows.js";
import useRavenStore from "../../store/useRavenStore.js";
import CreateShowModal from "../Modals/CreateShowModal/CreateShowModal.jsx";
import styles from "./Nav.module.css";

const NavDropdown = ({ label, items, disabled }) => (
  <NavigationMenu.Item className={styles.navItem}>
    <NavigationMenu.Trigger className={styles.navTrigger} disabled={disabled}>
      {label}
    </NavigationMenu.Trigger>
    <NavigationMenu.Content className={styles.navContent}>
      <ul className={styles.navDropdownList}>
        {items.map((item, i) =>
          item.separator ? (
            <li key={i} className={styles.navSeparator} />
          ) : (
            <li key={i}>
              <button className={styles.navDropdownButton} onClick={item.onClick}>
                {item.label}
              </button>
            </li>
          )
        )}
      </ul>
    </NavigationMenu.Content>
  </NavigationMenu.Item>
);

const NavItem = ({ to, label, disabled }) => {
  const { pathname } = useLocation();
  const isActive = !!useMatch(to) || pathname.startsWith(to);
  const className = [styles.navLink, isActive && styles.navLinkActive].filter(Boolean).join(" ");
  const isDisabled = disabled || isActive;

  return (
    <NavigationMenu.Item className={styles.navItem}>
      <NavigationMenu.Link asChild>
        <NavLink to={to} className={className} aria-disabled={isDisabled}>
          {label}
        </NavLink>
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  );
};

const showLinks = [
  { route: "properties", label: "Properties" },
  { route: "build", label: "Build" },
  { route: "gmail", label: "Email" },
];

const Nav = () => {
  const { mutate: sync } = useSyncShows();
  const { mutate: createWorkbook } = useCreateSettlementWorkbook();
  const { mutate: createMarketingAssetsFolder } = useCreateMarketingAssetsFolder();
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const [createShowOpen, setCreateShowOpen] = useState(false);
  const isSelectedShowVisible = useRavenStore((s) => s.isSelectedShowVisible);
  const leftPaneWidth = useRavenStore((s) => s.leftPaneWidth);
  const leftNavRef = useRef(null);
  const [leftNavWidth, setLeftNavWidth] = useState(0);
  const oneRem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const spacerWidth = Math.max(0, leftPaneWidth - leftNavWidth - oneRem);

  const dropdownMenus = [
    {
      label: "Drive",
      items: [
        { label: "Create a New Show Folder", onClick: () => setCreateShowOpen(true) },
        { separator: true },
        { label: "Sync from Drive", onClick: () => sync() },
      ],
    },
    {
      label: "Content",
      disabled: !isSelectedShowVisible,
      items: [
        {
          label: "Create Settlement Workbook",
          onClick: () => createWorkbook({ googleFolderId: selectedShow?.googleFolderId }),
        },
        {
          label: "Create Marketing Assets Folder",
          onClick: () =>
            createMarketingAssetsFolder({ googleFolderId: selectedShow?.googleFolderId }),
        },
        { separator: true },
        { label: "Generate Contract", onClick: () => {} },
      ],
    },
  ];
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
            {dropdownMenus.map(({ label, disabled, items }) => (
              <NavDropdown key={label} label={label} disabled={disabled} items={items} />
            ))}
          </div>

          <div className={styles.navSpacer} style={{ width: spacerWidth }} />

          {showLinks.map(({ route, label }) => (
            <NavItem
              key={route}
              to={`/shows/${selectedShow?.googleFolderId}/${route}`}
              label={label}
              disabled={!isSelectedShowVisible}
            />
          ))}
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
