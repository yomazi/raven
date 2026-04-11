import gridThemeParams from "@components/Content/shared/grid/grid-theme-params.js";
import { useShows } from "@hooks/useShows.js";
import useRavenStore from "@store/useRavenStore.js";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EventGrid.module.css";
import { columnDefs } from "./grid-definitions.js";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams(gridThemeParams);

const EventGrid = () => {
  const { showFolderId } = useParams();
  const gridRef = useRef();
  const filterInputRef = useRef();
  const navigate = useNavigate();
  const { data: shows, isLoading, isError } = useShows();
  const statusMessage = useRavenStore((s) => s.statusMessage);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const isExternalFilterPresent = useCallback(() => upcomingOnly, [upcomingOnly]);
  const setIsSelectedShowVisible = useRavenStore((s) => s.setIsSelectedShowVisible);

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

  const routeToShow = useCallback(
    (showFolderId) => {
      const currentAction = window.location.pathname.split("/").slice(3).join("/");
      const url = `/shows/${showFolderId}/${currentAction}`;
      navigate(url);
    },
    [navigate]
  );

  const formatShortDate = (dateString) => {
    if (!dateString) return "";
    return dateString.slice(0, 10);
  };

  const selectedShow = useRavenStore((s) => s.selectedShow);
  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);
  const selectedShowRef = useRef(selectedShow);

  useEffect(() => {
    selectedShowRef.current = selectedShow;
  }, [selectedShow]);

  const getRowId = useCallback(({ data }) => data.googleFolderId, []);

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

      // the "/" key focuses the filter input, even if you're currently typing in another input
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }

      // Ctrl+U toggles the "upcoming only" filter
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        setUpcomingOnly((prev) => !prev);
      }

      // Cmd+Ctrl+O opens the selected show's folder in Google Drive
      if (e.ctrlKey && e.metaKey && e.key === "o") {
        e.preventDefault();
        if (selectedShowRef.current?.googleFolderId) {
          openFolder(selectedShowRef.current.googleFolderId);
        }
      }

      // the "Escape" key clears the filter input and removes the quick filter, even if you're currently typing in the filter input
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        filterInputRef.current.value = "";
        gridRef.current.api.setGridOption("quickFilterText", "");
        filterInputRef.current.blur();
      }
    };
    /*
    window.addEventListener("keydown", (e) => {
      console.log("key:", e.key, "ctrl:", e.ctrlKey, "meta:", e.metaKey);
    });
    */
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [upcomingOnly]);

  const onFilterInput = useCallback((e) => {
    gridRef.current.api.setGridOption("quickFilterText", e.target.value);
  }, []);

  const onFilterKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;

      const firstNode = gridRef.current?.api?.getRenderedNodes().find((node) => node.data);

      if (!firstNode?.data) return;

      const { googleFolderId } = firstNode.data;

      firstNode.setSelected(true, true); // (selected, clearOthers)
      setSelectedShow(firstNode.data);
      setIsSelectedShowVisible(true);
      if (googleFolderId) routeToShow(googleFolderId);
      filterInputRef.current?.blur();
    },
    [setSelectedShow, setIsSelectedShowVisible, routeToShow]
  );

  const selectRowByFolderId = (folderId) => {
    if (!folderId || !gridRef.current?.api) return;
    gridRef.current.api.forEachNode((node) => {
      if (node.data?.googleFolderId === folderId) {
        node.setSelected(true, true);
        gridRef.current.api.ensureNodeVisible(node, "middle");
      }
    });
  };

  const onFirstDataRendered = () => {
    if (!showFolderId || !shows) return;
    const match = shows.find((s) => s.googleFolderId === showFolderId);
    if (!match) return;
    setSelectedShow(match);
    setIsSelectedShowVisible(true);
    selectRowByFolderId(showFolderId);
  };

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
          onKeyDown={onFilterKeyDown}
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
          animateRows={false}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: false, suppressMovable: true }}
          getRowId={getRowId}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onCellClicked={handleCellClicked}
          onFirstDataRendered={onFirstDataRendered}
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

export default EventGrid;
