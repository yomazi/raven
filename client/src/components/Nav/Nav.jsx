import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import { useCancelShow } from "../../hooks/useCancelShow.js";
import { useCreateMarketingAssetsFolder } from "../../hooks/useCreateMarketingAssetsFolder.js";
import { useCreateSettlementWorkbook } from "../../hooks/useCreateSettlementWorkbook.js";
import { useDeleteShow } from "../../hooks/useDeleteShow.js";
import { useSyncShows } from "../../hooks/useSyncShows.js";
import useRavenStore from "../../store/useRavenStore.js";
import ConfirmModal from "../Modals/ConfirmModal/ConfirmModal.jsx";
import CreateShowModal from "../Modals/CreateShowModal/CreateShowModal.jsx";
import RenameShowModal from "../Modals/RenameShowModal/RenameShowModal.jsx";
import RescheduleShowModal from "../Modals/RescheduleShowModal/RescheduleShowModal.jsx";
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
  { route: "build", label: "Build" },
  { route: "properties", label: "Properties" },
  { route: "contracts", label: "Contracts" },
  { route: "gmail", label: "Email" },
  { route: "files", label: "Files" },
  {
    label: "Workflows",
    items: [{ route: "test", label: "Parse Offers & Contracts" }],
  },
];

const Nav = () => {
  const navigate = useNavigate();
  const { mutate: sync } = useSyncShows();
  const { mutate: createWorkbook } = useCreateSettlementWorkbook();
  const { mutate: createMarketingAssetsFolder } = useCreateMarketingAssetsFolder();
  const { mutateAsync: deleteShow } = useDeleteShow();
  const { mutate: setCanceled } = useCancelShow();
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const [createShowOpen, setCreateShowOpen] = useState(false);
  const [renameShowOpen, setRenameShowOpen] = useState(false);
  const [rescheduleShowOpen, setRescheduleShowOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
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
        { label: "Rename Show", onClick: () => setRenameShowOpen(true) },
        { label: "Reschedule Show", onClick: () => setRescheduleShowOpen(true) },
        { separator: true },
        {
          label: selectedShow?.canceled ? "Un-cancel Show" : "Cancel Show",
          onClick: () => setCancelConfirmOpen(true),
        },
        { separator: true },
        { label: "Delete Show", onClick: () => setDeleteConfirmOpen(true) },
      ],
    },
  ];

  const handleDeleteShow = async () => {
    await deleteShow({ googleFolderId: selectedShow?.googleFolderId });
    navigate("/roster");
  };

  const handleToggleCanceled = () => {
    setCanceled({ googleFolderId: selectedShow?.googleFolderId, canceled: !selectedShow?.canceled });
  };
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

          {showLinks.map((entry) =>
            entry.items ? (
              <NavDropdown
                key={entry.label}
                label={entry.label}
                disabled={!isSelectedShowVisible}
                items={entry.items.map((item) => ({
                  label: item.label,
                  onClick: () => navigate(`/roster/${selectedShow?.googleFolderId}/${item.route}`),
                }))}
              />
            ) : (
              <NavItem
                key={entry.route}
                to={`/roster/${selectedShow?.googleFolderId}/${entry.route}`}
                label={entry.label}
                disabled={!isSelectedShowVisible}
              />
            )
          )}
        </NavigationMenu.List>
      </NavigationMenu.Root>

      <CreateShowModal
        key={createShowOpen ? "create-open" : "create-closed"}
        open={createShowOpen}
        onOpenChange={setCreateShowOpen}
      />

      <RenameShowModal
        key={renameShowOpen ? "rename-open" : "rename-closed"}
        open={renameShowOpen}
        onOpenChange={setRenameShowOpen}
        googleFolderId={selectedShow?.googleFolderId}
        currentArtist={selectedShow?.artist}
      />

      <RescheduleShowModal
        key={rescheduleShowOpen ? "reschedule-open" : "reschedule-closed"}
        open={rescheduleShowOpen}
        onOpenChange={setRescheduleShowOpen}
        googleFolderId={selectedShow?.googleFolderId}
        currentArtist={selectedShow?.artist}
        currentDate={selectedShow?.date}
        currentMultipleShows={selectedShow?.isMulti}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete show?"
        message={`Delete "${selectedShow?.artist}"? Its Drive folder will be moved to Trash and it will no longer appear in Raven. This can be undone from Google Drive's Trash, but not from within Raven.`}
        confirmLabel="Delete Show"
        onConfirm={handleDeleteShow}
        danger
      />

      <ConfirmModal
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={selectedShow?.canceled ? "Un-cancel show?" : "Cancel show?"}
        message={
          selectedShow?.canceled
            ? `Mark "${selectedShow?.artist}" as no longer canceled? It will start appearing in reports again.`
            : `Cancel "${selectedShow?.artist}"? It will be removed from the Builds roster tab and stop appearing in reports. Its Drive folder and data are untouched — this can be undone.`
        }
        confirmLabel={selectedShow?.canceled ? "Un-cancel Show" : "Cancel Show"}
        onConfirm={handleToggleCanceled}
      />
    </>
  );
};

export default Nav;
