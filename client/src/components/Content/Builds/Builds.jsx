import { useBuildRosterShows } from "@hooks/useBuildRosterShows";
import SvgRefresh from "@svg/refresh_google.svg?react";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef } from "react";
import styles from "./Builds.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams({
  cellHorizontalPadding: 8,

  // Chrome
  borderColor: "#3d2f8a",
  rowBorder: { color: "#1d1828", width: 1 },

  // Header
  headerBackgroundColor: "#110e1a",
  headerTextColor: "#f0e8d0",

  // Rows
  oddRowBackgroundColor: "#303030",
  rowHoverColor: "#2e2648",
  selectedRowBackgroundColor: "#4a3d78",

  // Text
  foregroundColor: "#e3e3e3",

  // Icons
  iconColor: "#e3e3e3",
});

// ─── cell renderers ───────────────────────────────────────────────────────────

const DateCell = ({ value }) => {
  if (!value) return <div className={styles.dateCell}>—</div>;
  const formatted = new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return <div className={styles.dateCell}>{formatted}</div>;
};

const ArtistCell = ({ value }) => {
  return <div className={styles.artistCell}>{value ?? "—"}</div>;
};

// ─── Builds ──────────────────────────────────────────────────────────────────

export default function Builds() {
  const gridRef = useRef();
  const { data: shows = [], isLoading, refetch } = useBuildRosterShows();

  const rowData = useMemo(() => {
    return [...shows].sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateA - dateB;
    });
  }, [shows]);

  const columnDefs = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        cellRenderer: DateCell,
        sortable: true,
        width: 120,
        minWidth: 120,
        maxWidth: 120,
      },
      {
        field: "artist",
        headerName: "Artist",
        cellRenderer: ArtistCell,
        sortable: true,
        flex: 1,
        minWidth: 200,
      },
      {
        field: "isMulti",
        headerName: "Multi",
        headerClass: "ag-header-cell-center",
        cellClass: "ag-center-aligned-cell",
        cellRenderer: ({ value }) => <div className={styles.multiCell}>{value ? "Yes" : ""}</div>,
        sortable: true,
        width: 80,
        minWidth: 80,
        maxWidth: 80,
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      filter: false,
      sortable: true,
    }),
    []
  );

  const getRowId = useCallback(({ data }) => data.googleFolderId, []);

  return (
    <div className={styles.root}>
      {/* ── toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.title}>Build Roster</span>
        <div className={styles.rightActions}>
          <button className="primary" onClick={() => refetch()}>
            <SvgRefresh />
            Reload
          </button>
        </div>
      </div>

      {/* ── grid */}
      {isLoading ? (
        <div className={styles.loading}>Loading roster…</div>
      ) : (
        <div className={`ag-theme-alpine-dark ${styles.grid}`}>
          <AgGridReact
            ref={gridRef}
            theme={theme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            animateRows
            suppressCellFocus
          />
        </div>
      )}
    </div>
  );
}
