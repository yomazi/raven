import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import styles from "./Grid.module.css";
import ClosedFolder from "/svg/folder_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg";
import OpenFolder from "/svg/folder_open_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg";

ModuleRegistry.registerModules([AllCommunityModule]);

const FolderIconRenderer = (params) => {
  const url = params.data.artist.url;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.folderLink}>
      <img src={ClosedFolder} alt="folder" className={styles.iconFolderClosed} />
      <img src={OpenFolder} alt="folder" className={styles.iconFolderOpen} />
    </a>
  );
};

const ArtistNameRenderer = (params) => {
  const navigate = useNavigate();

  // Extract the "current action" from the URL
  const currentAction = window.location.pathname.split("/").slice(2).join("/");

  const handleClick = () => {
    const id = params.data.artist.id;

    navigate(`/${id}/${currentAction}`);
  };

  return (
    <div onClick={handleClick} className={styles.clickableLinkCell}>
      {params.data.artist.label}
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
    suppressMovable: true,
  },
  {
    headerName: "",
    field: "folder",
    flex: 1,
    valueGetter: (params) => params.data.artist.label, // used for sorting
    cellRenderer: FolderIconRenderer,
    cellClass: "ag-center-aligned-cell",
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
    suppressMovable: true,
  },
  {
    headerName: "Date",
    field: "date",
    type: "dateColumn",
    flex: 1,
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = new Date(params.value);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    cellClass: "ag-right-aligned-cell",
    suppressAutoSize: true,
    suppressMovable: true,
  },
  {
    headerName: "Multi",
    field: "isMulti",
    flex: 1,
    cellRenderer: (params) =>
      params.value ? <input type="checkbox" checked={params.value} readOnly /> : null,
    cellClass: "ag-center-aligned-cell",
    width: 100, // fixed width in pixels
    minWidth: 100,
    maxWidth: 100,
    resizable: false,
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

const Grid = () => {
  return (
    <div
      className="ag-theme-alpine dark raven-grid"
      data-ag-theme-mode="dark-blue"
      style={{ flex: 1, height: "100%" }}
    >
      <AgGridReact
        valueCache={true}
        rowHeight={28}
        headerHeight={36}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: true }}
        suppressColumnMoveAnimation={true}
        animateRows={false}
      />
    </div>
  );
};

export default Grid;
