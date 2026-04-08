import {
  AddTaskIconRenderer,
  ArtistNameRenderer,
  CheckboxRenderer,
  DateRenderer,
  FolderIconRenderer,
  RowNumberRenderer,
} from "@components/Content/shared/grid/renderers.jsx";

export const columnDefs = [
  {
    headerName: "",
    valueGetter: (params) => params.node.rowIndex + 1,
    width: 20,
    pinned: "left", // Keep it visible while scrolling horizontally
    suppressMovable: true, // Prevents users from dragging it away
    cellRenderer: RowNumberRenderer,
    filter: false,
  },
  {
    headerName: "",
    cellRenderer: AddTaskIconRenderer,
    cellClass: "ag-center-aligned-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    suppressAutoSize: true,
  },
  {
    headerName: "Date",
    field: "date",
    width: 110,
    minWidth: 110,
    maxWidth: 110,
    cellRenderer: DateRenderer,
    suppressAutoSize: true,
    sort: "desc",
  },
  {
    headerName: "Artist",
    field: "artist",
    flex: 1,
    cellRenderer: ArtistNameRenderer,
  },
  {
    headerName: "Multi",
    field: "isMulti",
    cellRenderer: CheckboxRenderer,
    cellClass: "ag-center-aligned-cell",
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    suppressAutoSize: true,
  },
  {
    headerName: "",
    field: "folder",
    cellRenderer: FolderIconRenderer,
    cellClass: "ag-center-aligned-cell raven-grid-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    sortable: false,
  },
];
