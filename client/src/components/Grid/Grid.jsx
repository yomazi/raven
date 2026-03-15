import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
// import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import SvgCheckboxChecked from "../../assets/svg/check_box_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import SvgFolderClosed from "../../assets/svg/folder_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import SvgFolderOpen from "../../assets/svg/folder_open_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import styles from "./Grid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const FolderIconRenderer = () => {
  return (
    <div className={styles.folderLinkCell}>
      <SvgFolderClosed className={styles.iconFolderClosed} />
      <SvgFolderOpen className={styles.iconFolderOpen} />
    </div>
  );
};

const ArtistNameRenderer = (params) => {
  return <div className={styles.artistNameCell}>{params.data.artist.label}</div>;
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toISOString().split("T")[0]; // "2026-01-04"
};

const DateRenderer = (params) => {
  const dateValue = formatDate(params.value);

  return <div className={styles.dateCell}>{dateValue}</div>;
};

const CheckboxRenderer = (params) => {
  return (
    <div className={styles.checkboxCell}>
      {params.value ? <SvgCheckboxChecked className={styles.checkboxChecked} /> : null}
    </div>
  );
};

const columnDefs = [
  {
    headerName: "#",
    valueGetter: "node.rowIndex + 1",
    width: 70,
    pinned: "left",
    sortable: false,
    resizable: false,
    suppressMovable: true,
  },
  {
    headerName: "",
    field: "folder",
    flex: 1,
    valueGetter: (params) => params.data.artist.label, // used for sorting
    cellRenderer: FolderIconRenderer,
    cellClass: "ag-center-aligned-cell raven-grid-cell",
    width: 60,
    minWidth: 60,
    maxWidth: 60,
    resizable: false,
    sortable: false,
    suppressMovable: true,
  },
  {
    headerName: "Artist",
    field: "artist",
    flex: 1,
    valueGetter: (params) => params.data.artist.label, // used for sorting
    cellRenderer: ArtistNameRenderer,
    resizable: false,
    suppressMovable: true,
  },
  {
    headerName: "Date",
    field: "date",
    type: "dateColumn",
    width: 120,
    minWidth: 120,
    maxWidth: 120,
    cellRenderer: DateRenderer,
    resizable: false,
    suppressAutoSize: true,
    suppressMovable: true,
  },
  {
    headerName: "Multi",
    field: "isMulti",
    flex: 1,
    cellRenderer: CheckboxRenderer,
    cellClass: "ag-center-aligned-cell",
    width: 100, // fixed width in pixels
    minWidth: 100,
    maxWidth: 100,
    resizable: false,
    suppressAutoSize: true,
    suppressMovable: true,
  },
];

// Simulate a large dataset
const rowData = Array.from({ length: 10000 }, (_, i) => ({
  artist: { label: `Item ${i}`, id: i, url: `https://example.com/${i}` },
  artistLabel: { label: `Item ${i}` },
  date: new Date(2026, 2, (i % 28) + 1).toISOString(),
  isMulti: Math.random() < 0.5,
}));

const theme = themeAlpine.withPart(colorSchemeDark);

const Grid = () => {
  const navigate = useNavigate();

  const openFolder = (url) => {
    window.open(
      url, // URL
      "_blank", // open in new tab/window
      "noopener,noreferrer" // window features (important for security)
    );
  };

  const routeToShow = (id) => {
    // Extract the "current action" from the URL
    const currentAction = window.location.pathname.split("/").slice(2).join("/");

    navigate(`/${id}/${currentAction}`);
  };

  const handleCellClick = (e) => {
    const field = e.colDef?.field || "unknown";
    const isFolder = field === "folder";
    const isValidField = field !== "unknown";

    const id = e.data?.artist?.id;

    if (isFolder) {
      const url = e.data?.artist?.url;

      url ? openFolder(url) : console.warn(`No URL found for the folder in row ${id}`);
    } else if (isValidField && id !== undefined) {
      const id = e.data?.artist?.id;
      const isIdValid = id !== undefined && id !== null;

      isIdValid ? routeToShow(id) : console.warn(`No ID found for the artist in row ${id}`);
    }
  };

  return (
    <div className="raven-grid" style={{ flex: 1, height: "100%" }}>
      <AgGridReact
        valueCache={true}
        theme={theme}
        rowHeight={28}
        headerHeight={36}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: true }}
        suppressColumnMoveAnimation={true}
        animateRows={false}
        onCellClicked={handleCellClick}
      />
    </div>
  );
};

export default Grid;
