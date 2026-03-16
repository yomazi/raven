import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { useShows } from "../../hooks/useShows.js";
import { columnDefs } from "./grid-definitions.js";
import styles from "./Grid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark);

const Grid = () => {
  const navigate = useNavigate();
  const { data: shows, isLoading, isError, status } = useShows();
  console.log("Grid query status:", { status, isLoading, isError, showsCount: shows?.length });

  const openFolder = (folderId) => {
    console.log(folderId);
    const url = `https://drive.google.com/drive/folders/${folderId}`;

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

    const { artist, date, googleFolderId } = e.data;

    if (isFolder) {
      googleFolderId
        ? openFolder(googleFolderId)
        : console.warn(`No URL found for "${artist}" on ${date}`);
    } else if (isValidField) {
      googleFolderId
        ? routeToShow(googleFolderId)
        : console.warn(`No URL found for "${artist}" on ${date}`);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading shows.</div>;

  return (
    <div className={styles.ravenGrid} style={{ height: "100%" }}>
      <AgGridReact
        valueCache={true}
        theme={theme}
        rowHeight={28}
        headerHeight={36}
        rowData={shows}
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
