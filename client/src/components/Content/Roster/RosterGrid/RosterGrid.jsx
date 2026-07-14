import { closeCurrentBadge } from "@components/Content/shared/BadgeSelect/badgeSelectSingleton.js";
import gridThemeParams from "@components/Content/shared/grid/grid-theme-params.js";
import gridStyles from "@components/Content/shared/grid/Grid.module.css";
import { useBuildRosterShows } from "@hooks/useBuildRosterShows";
import { useShows } from "@hooks/useShows.js";
import useRavenStore from "@store/useRavenStore.js";
import ConstructionIcon from "@svg/construction_google.svg?react";
import EventIcon from "@svg/events_google.svg?react";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildsColumnDefs, showsColumnDefs } from "./grid-definitions.js";
import styles from "./RosterGrid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams(gridThemeParams);

const CONFIGS = {
  shows: {
    columnDefs: showsColumnDefs,
    defaultColDef: { resizable: false, suppressMovable: true },
  },
  builds: {
    columnDefs: buildsColumnDefs,
    defaultColDef: { resizable: false, filter: false, sortable: true },
  },
};

const DEFAULT_SORT = [{ colId: "date", sort: "desc" }];

const getColIds = (columnDefs) =>
  new Set(columnDefs.map((cd) => cd.colId ?? cd.field).filter(Boolean));

export default function RosterGrid() {
  const { showFolderId } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef();
  const gridContainerRef = useRef();
  const filterInputRef = useRef();
  const [viewMode, setViewMode] = useState("shows");
  const [sortModel, setSortModel] = useState(DEFAULT_SORT);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(0);

  const { data: shows = [], isLoading: isShowsLoading } = useShows();
  const { data: rosterShows = [], isLoading: isRosterLoading } = useBuildRosterShows();

  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);
  const setIsSelectedShowVisible = useRavenStore((s) => s.setIsSelectedShowVisible);
  const selectedShow = useRavenStore((s) => s.selectedShow);
  const selectedShowRef = useRef(selectedShow);

  useEffect(() => {
    selectedShowRef.current = selectedShow;
  }, [selectedShow]);

  const isLoading = viewMode === "shows" ? isShowsLoading : isRosterLoading;
  // Row order is otherwise driven entirely by the grid's active sortModel.
  const rowData = viewMode === "shows" ? shows : rosterShows;

  const { columnDefs, defaultColDef } = CONFIGS[viewMode];

  // Carries a sort over to the other config when it's set on a column that
  // exists in both (e.g. "artist"); otherwise falls back to the default
  // date-descending sort.
  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === viewMode) return;

      const currentSort = gridRef.current?.api
        ? gridRef.current.api
            .getColumnState()
            .filter((c) => c.sort)
            .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
            .map(({ colId, sort, sortIndex }) => ({ colId, sort, sortIndex }))
        : sortModel;

      const nextColIds = getColIds(CONFIGS[nextMode].columnDefs);
      const preserved = currentSort.filter((s) => nextColIds.has(s.colId));

      setSortModel(preserved.length > 0 ? preserved : DEFAULT_SORT);
      setViewMode(nextMode);
      // Builds always starts upcoming-only, since a show's build.shouldShowInRoster
      // flag is usually left true well after the show's date — this filter is
      // what actually keeps past shows out of the Builds roster day to day.
      if (nextMode === "builds") setUpcomingOnly(true);
    },
    [viewMode, sortModel]
  );

  const getRowId = useCallback(({ data }) => data.googleFolderId, []);

  const openFolder = (folderId) => {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Keeps the current Properties/Contracts/Build/Email/Workflows sub-tab
  // active when switching to a different show.
  const routeToShow = useCallback(
    (folderId) => {
      const currentAction = window.location.pathname.split("/").slice(3).join("/");
      navigate(`/roster/${folderId}/${currentAction}`);
    },
    [navigate]
  );

  const formatShortDate = (dateString) => (dateString ? dateString.slice(0, 10) : "");

  const copyLink = ({ artist, date, googleFolderId, includeDate }) => {
    const url = `https://drive.google.com/drive/folders/${googleFolderId}`;
    const shortDate = formatShortDate(date);
    const plainText = includeDate ? `${shortDate} ${artist}` : artist;
    const html = includeDate
      ? `<table><tr><td>${shortDate}</td><td><a href="${url}">${artist}</a></td></tr></table>`
      : `<table><tr><td><a href="${url}">${artist}</a></td></tr></table>`;
    navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
  };

  const onCellClicked = useCallback(
    (e) => {
      if (e.event.button !== 0) return;

      const field = e.colDef?.field || "unknown";
      const { artist, date, googleFolderId } = e.data;

      if (field === "folder") {
        if (googleFolderId) openFolder(googleFolderId);
        return;
      }
      if (field === "copyDateAndArtistLink") {
        copyLink({ artist, date, googleFolderId, includeDate: true });
        return;
      }
      if (field === "copyArtistLink") {
        copyLink({ artist, date, googleFolderId, includeDate: false });
        return;
      }

      closeCurrentBadge();
      setSelectedShow(e.data);
      setIsSelectedShowVisible(true);
      if (googleFolderId) {
        routeToShow(googleFolderId);
      }
    },
    [routeToShow, setSelectedShow, setIsSelectedShowVisible]
  );

  // "Upcoming Only" applies in both Shows and Builds mode — both row sets
  // carry a top-level `date` field since they're both sourced from Show docs.
  const isExternalFilterPresent = useCallback(() => upcomingOnly, [upcomingOnly]);

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

  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [upcomingOnly]);

  const onFilterChanged = useCallback(() => {
    if (!selectedShow) return;
    const visibleIds = [];
    gridRef.current.api.forEachNodeAfterFilter((node) => {
      visibleIds.push(node.data?.googleFolderId);
    });
    setIsSelectedShowVisible(visibleIds.includes(selectedShow.googleFolderId));
  }, [selectedShow, setIsSelectedShowVisible]);

  // Keeps the "N shows" count in sync with the active filter (e.g. Upcoming
  // Only), not just the raw row count — fires on filter, sort, and data changes.
  const onModelUpdated = useCallback(() => {
    setDisplayedCount(gridRef.current?.api?.getDisplayedRowCount() ?? 0);
  }, []);

  // Reapplies the preserved/default sort whenever the mode (and thus
  // columnDefs) changes, since the grid is no longer remounted per mode.
  useEffect(() => {
    gridRef.current?.api?.applyColumnState({
      state: sortModel,
      defaultState: { sort: null },
    });
  }, [viewMode, sortModel]);

  // autosize the grid!
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      gridRef.current?.api?.sizeColumnsToFit();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [viewMode]);

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

      // Cmd+Ctrl+O opens the selected show's folder in Google Drive
      if (e.ctrlKey && e.metaKey && e.key === "o") {
        e.preventDefault();
        if (selectedShowRef.current?.googleFolderId) {
          openFolder(selectedShowRef.current.googleFolderId);
        }
      }

      // Ctrl/Cmd+U toggles the "upcoming only" filter
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        setUpcomingOnly((prev) => !prev);
      }

      // the "Escape" key clears the filter input and removes the quick filter
      // — unless some other overlay (e.g. the recipient picker's dropdown) has
      // claimed Escape for itself
      if (e.key === "Escape" && !useRavenStore.getState().suppressGridEscapeClear) {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement === filterInputRef.current || filterInputRef.current?.value) {
          filterInputRef.current.value = "";
          gridRef.current?.api?.setGridOption("quickFilterText", "");
          filterInputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

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
      if (googleFolderId) {
        closeCurrentBadge();
        routeToShow(googleFolderId);
      }
      filterInputRef.current?.blur();
    },
    [routeToShow, setSelectedShow, setIsSelectedShowVisible]
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

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onFirstDataRendered = () => {
    if (!showFolderId || !rowData) return;
    const match = rowData.find((s) => s.googleFolderId === showFolderId);
    if (!match) return;
    setSelectedShow(match);
    setIsSelectedShowVisible(true);
    selectRowByFolderId(showFolderId);
  };

  return (
    <div className={styles.root}>
      {isLoading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <>
          <div className={gridStyles.filterBar}>
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
              className={gridStyles.filterInput}
            />
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={styles.modeButton}
                data-active={viewMode === "shows"}
                onClick={() => handleModeChange("shows")}
              >
                <EventIcon className={styles.modeButtonIcon} />
                Shows
              </button>
              <button
                type="button"
                className={styles.modeButton}
                data-active={viewMode === "builds"}
                onClick={() => handleModeChange("builds")}
              >
                <ConstructionIcon className={styles.modeButtonIcon} />
                Builds
              </button>
            </div>
            <div className={styles.rosterInfo}>
              <span className={styles.rosterLength}>{displayedCount}</span> shows
            </div>
          </div>
          <div className={`ag-theme-alpine-dark ${styles.grid}`} ref={gridContainerRef}>
            <AgGridReact
              ref={gridRef}
              theme={theme}
              rowHeight={28}
              headerHeight={36}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellClicked={onCellClicked}
              rowSelection={{ mode: "singleRow", enableClickSelection: true, checkboxes: false }}
              getRowId={getRowId}
              suppressCellFocus
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onFilterChanged={onFilterChanged}
              onModelUpdated={onModelUpdated}
              onGridReady={onGridReady}
              onFirstDataRendered={onFirstDataRendered}
              initialState={{ sort: { sortModel } }}
            />
          </div>
        </>
      )}
    </div>
  );
}
