import { closeCurrentBadge } from "@components/Content/shared/BadgeSelect/badgeSelectSingleton.js";
import gridThemeParams from "@components/Content/shared/grid/grid-theme-params.js";
import gridStyles from "@components/Content/shared/grid/Grid.module.css";
import { useBuildRosterShows } from "@hooks/useBuildRosterShows";
import useRavenStore from "@store/useRavenStore.js";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BuildRoster.module.css";
import { columnDefs } from "./grid-definitions.js";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams(gridThemeParams);

// ─── Builds ──────────────────────────────────────────────────────────────────

export default function BuildRoster() {
  const navigate = useNavigate();
  const gridRef = useRef();
  const { data: shows = [], isLoading } = useBuildRosterShows();
  const setIsSelectedShowVisible = useRavenStore((s) => s.setIsSelectedShowVisible);

  const selectedShow = useRavenStore((s) => s.selectedShow);
  const setSelectedShow = useRavenStore((s) => s.setSelectedShow);
  const selectedShowRef = useRef(selectedShow);
  const filterInputRef = useRef();

  useEffect(() => {
    selectedShowRef.current = selectedShow;
  }, [selectedShow]);

  const onFilterChanged = useCallback(() => {
    if (!selectedShow) return;
    const visibleIds = [];
    gridRef.current.api.forEachNodeAfterFilter((node) => {
      visibleIds.push(node.data?.googleFolderId);
    });
    setIsSelectedShowVisible(visibleIds.includes(selectedShow.googleFolderId));
  }, [selectedShow, setIsSelectedShowVisible]);

  const onRowClicked = useCallback(
    ({ data }) => {
      closeCurrentBadge();
      setSelectedShow(data);
      setIsSelectedShowVisible(true);
      navigate(`/builds/${data.googleFolderId}`);
    },
    [setSelectedShow, setIsSelectedShowVisible, navigate]
  );

  const rowData = useMemo(() => {
    return [...shows].sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateA - dateB;
    });
  }, [shows]);

  const defaultColDef = useMemo(
    () => ({
      resizable: false,
      filter: false,
      sortable: true,
    }),
    []
  );

  const getRowId = useCallback(({ data }) => data.googleFolderId, []);

  const openFolder = (folderId) => {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
        // Only handle if filter input is focused or has a value
        if (document.activeElement === filterInputRef.current || filterInputRef.current.value) {
          filterInputRef.current.value = "";
          gridRef.current.api.setGridOption("quickFilterText", "");
          filterInputRef.current.blur();
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
        navigate(`/builds/${googleFolderId}`);
      }
      filterInputRef.current?.blur();
    },
    [setSelectedShow, setIsSelectedShowVisible, navigate]
  );

  return (
    <div className={styles.root}>
      {/* ── grid */}
      {isLoading ? (
        <div className={styles.loading}>Loading roster…</div>
      ) : (
        <>
          <div className={gridStyles.filterBar}>
            <input
              ref={filterInputRef}
              name="raven-grid-filter"
              type="search"
              placeholder='(press "/" to filter)'
              onChange={onFilterInput}
              onKeyDown={onFilterKeyDown}
              className={gridStyles.filterInput}
            />
            <div className={styles.rosterInfo}>
              <span className={styles.rosterLength}>{shows.length}</span> shows
            </div>
          </div>
          <div className={`ag-theme-alpine-dark ${styles.grid}`}>
            <AgGridReact
              ref={gridRef}
              valueCache={true}
              theme={theme}
              rowHeight={28}
              headerHeight={36}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onRowClicked={onRowClicked}
              rowSelection={{ mode: "singleRow", enableClickSelection: true, checkboxes: false }}
              getRowId={getRowId}
              animateRows={true}
              suppressCellFocus
              onFilterChanged={onFilterChanged}
              initialState={{
                sort: {
                  sortModel: [{ colId: "date", sort: "desc" }],
                },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
