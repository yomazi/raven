import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShows } from "../../hooks/useShows.js";
import useShowsStore from "../../store/useShowsStore.js";
import { columnDefs } from "./grid-definitions.js";
import styles from "./Grid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams({
  cellHorizontalPadding: 8,

  // Chrome
  borderColor: "#3d2f8a", // --color-wyrd-dim
  rowBorder: { color: "#1d1828", width: 1 }, // --color-dusk

  // Header
  headerBackgroundColor: "#110e1a", // --color-void
  headerTextColor: "#f0e8d0", // --color-moonlight

  // Rows
  oddRowBackgroundColor: "#303030",
  rowHoverColor: "#2e2648", // --color-stone
  selectedRowBackgroundColor: "#4a3d78", // --color-wyrd-dim

  // Text
  foregroundColor: "#e3e3e3",

  // Icons
  iconColor: "#e3e3e3",
});

const Grid = () => {
  const gridRef = useRef();
  const filterInputRef = useRef();
  const navigate = useNavigate();
  const { data: shows, isLoading, isError } = useShows();
  const statusMessage = useShowsStore((s) => s.statusMessage);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const isExternalFilterPresent = useCallback(() => upcomingOnly, [upcomingOnly]);
  const setIsSelectedShowVisible = useShowsStore((s) => s.setIsSelectedShowVisible);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (!upcomingOnly) return true;
      const date = node.data?.date;
      if (!date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(date) >= today;
    },
    [upcomingOnly]
  );

  const openFolder = (folderId) => {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const routeToShow = (id) => {
    const currentAction = window.location.pathname.split("/").slice(2).join("/");
    navigate(`/${id}/${currentAction}`);
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "";
    return dateString.slice(0, 10);
  };

  const selectedShow = useShowsStore((s) => s.selectedShow);
  const setSelectedShow = useShowsStore((s) => s.setSelectedShow);

  const onFilterChanged = useCallback(() => {
    if (!selectedShow) return;
    const visibleIds = [];
    gridRef.current.api.forEachNodeAfterFilter((node) => {
      visibleIds.push(node.data?.googleFolderId);
    });
    setIsSelectedShowVisible(visibleIds.includes(selectedShow.googleFolderId));
  }, [selectedShow, setIsSelectedShowVisible]);

  const handleCellClicked = (e) => {
    if (e.event.button !== 0) return;

    const field = e.colDef?.field || "unknown";
    const isFolder = field === "folder";
    const isCopyDateAndArtistLink = field === "copyDateAndArtistLink";
    const isCopyArtistLink = field === "copyArtistLink";
    const isValidField = field !== "unknown";

    const { artist, date, googleFolderId } = e.data;

    if (isFolder) {
      googleFolderId
        ? openFolder(googleFolderId)
        : console.warn(`No URL found for "${artist}" on ${date}`);
    } else if (isCopyDateAndArtistLink) {
      const shortDate = formatShortDate(date);
      const url = `https://drive.google.com/drive/folders/${googleFolderId}`;
      const plainText = `${shortDate} ${artist}`;
      const html = `
        <table>
          <tr>
            <td>${shortDate}</td>
            <td><a href="${url}">${artist}</a></td>
          </tr>
        </table>
      `;
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } else if (isCopyArtistLink) {
      const url = `https://drive.google.com/drive/folders/${googleFolderId}`;
      const plainText = `${artist}`;
      const html = `
        <table>
          <tr>
            <td><a href="${url}">${artist}</a></td>
          </tr>
        </table>
      `;
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } else if (isValidField) {
      setSelectedShow(e.data);
      setIsSelectedShowVisible(true);
      if (googleFolderId) {
        const currentShowId = window.location.pathname.split("/")[1];
        if (currentShowId !== googleFolderId) {
          routeToShow(googleFolderId);
        }
      } else {
        console.warn(`No URL found for "${artist}" on ${date}`);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        filterInputRef.current.value = "";
        gridRef.current.api.setGridOption("quickFilterText", "");
        filterInputRef.current.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [upcomingOnly]);

  const onFilterInput = useCallback((e) => {
    gridRef.current.api.setGridOption("quickFilterText", e.target.value);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading shows.</div>;

  const totalShows = shows?.length ?? 0;

  return (
    <div className={styles.ravenGridContainer}>
      <div className={styles.filterBar}>
        <label className={styles.upcomingFilter}>
          Upcoming Only:
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            onKeyDown={(e) => {
              if (e.key === "/") {
                e.preventDefault();
                filterInputRef.current?.focus();
                filterInputRef.current?.select();
              }
            }}
          />
        </label>
        <input
          ref={filterInputRef}
          name="raven-grid-filter"
          type="search"
          placeholder='(press "/" to filter)'
          onChange={onFilterInput}
          className={styles.filterInput}
        />
      </div>
      <div className={styles.ravenGrid} style={{ height: "100%" }}>
        <AgGridReact
          ref={gridRef}
          valueCache={true}
          theme={theme}
          rowHeight={28}
          headerHeight={36}
          rowData={shows}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: false, suppressMovable: true }}
          suppressColumnMoveAnimation={true}
          animateRows={false}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onCellClicked={handleCellClicked}
          rowSelection={{ mode: "singleRow", enableClickSelection: true, checkboxes: false }}
          onFilterChanged={onFilterChanged}
        />
      </div>
      <div className={styles.gridFooter} data-visible={!!statusMessage}>
        <span className={styles.rowCount}>{totalShows} shows</span>
        <span className={styles.statusMessage} data-type={statusMessage?.type ?? "info"}>
          {statusMessage?.text ?? ""}
        </span>
      </div>
    </div>
  );
};

export default Grid;
