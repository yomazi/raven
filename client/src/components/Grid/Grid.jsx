import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useShows } from "../../hooks/useShows.js";
import { columnDefs } from "./grid-definitions.js";
import styles from "./Grid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark);

const Grid = () => {
  const gridRef = useRef();
  const filterInputRef = useRef();
  const navigate = useNavigate();
  const { data: shows, isLoading, isError } = useShows();

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

  const formatShortDate = (dateString) => {
    if (!dateString) return "";

    const shortDate = dateString.slice(0, 10);

    return shortDate;
  };

  const handleCellClick = (e) => {
    const field = e.colDef?.field || "unknown";
    const isFolder = field === "folder";
    const isShortText = field === "shortText";
    const isValidField = field !== "unknown";

    const { artist, date, googleFolderId } = e.data;

    if (isFolder) {
      googleFolderId
        ? openFolder(googleFolderId)
        : console.warn(`No URL found for "${artist}" on ${date}`);
    } else if (isShortText) {
      const shortDate = formatShortDate(date);
      const url = `https://drive.google.com/drive/folders/${googleFolderId}`;

      // 1. Plain text
      const plainText = `${shortDate} ${artist}`;

      // 2. HTML (for Google Sheets and everything else)
      const html = `
        <table>
          <tr>
            <td>${shortDate}</td>
            <td><a href="${url}">${artist}</a></td>
          </tr>
        </table>
      `;

      const blobPlain = new Blob([plainText], { type: "text/plain" });
      const blobHtml = new Blob([html], { type: "text/html" });

      const clipboardItem = new ClipboardItem({
        "text/plain": blobPlain,
        "text/html": blobHtml,
      });

      navigator.clipboard.write([clipboardItem]);
    } else if (isValidField) {
      googleFolderId
        ? routeToShow(googleFolderId)
        : console.warn(`No URL found for "${artist}" on ${date}`);
    }
  };

  // Press "/" to jump to the filter input
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

      // Escape clears + blurs
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // this keeps AG Grid from taking over and ruining my beautiful workflow!
        filterInputRef.current.value = "";
        gridRef.current.api.setGridOption("quickFilterText", "");
        filterInputRef.current.blur();
      }
    };

    // listen for key events on the capture phase, before they get to AG Grid
    // (especially "Escape" - it's handled by the grid internally)
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  const onFilterInput = useCallback((e) => {
    gridRef.current.api.setGridOption("quickFilterText", e.target.value);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading shows.</div>;

  return (
    <div className={styles.ravenGridContainer}>
      <div>
        <input
          ref={filterInputRef}
          name="raven-grid-filter"
          type="search"
          placeholder='Filter… (press "/" to focus)'
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
          defaultColDef={{ resizable: true, sortable: true }}
          suppressColumnMoveAnimation={true}
          animateRows={false}
          onCellClicked={handleCellClick}
        />
      </div>
    </div>
  );
};

export default Grid;
