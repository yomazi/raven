// client/src/components/Content/Builds/BuildRoster/grid-definitions.js

import {
  AddTaskIconRenderer,
  ArtistNameRenderer,
  CheckboxRenderer,
  DateRenderer,
  FolderIconRenderer,
  RollupCellRenderer,
  ScheduleHeaderRenderer,
  ScheduleRenderer,
} from "@components/Content/shared/grid/renderers.jsx";
import {
  BUILD_FIELDS,
  CLOSE_FIELDS,
  ROLLUP_STATUS,
  SETUP_FIELDS,
} from "@shared/constants/builds.js";
import { deriveRollup } from "@shared/functions/builds.js";

// ---------------------------------------------------------------------------
// Rollup value getters
// ---------------------------------------------------------------------------

function setupValueGetter({ data }) {
  return deriveRollup(SETUP_FIELDS.map((f) => data.build?.[f] ?? "n/a"));
}

function buildValueGetter({ data }) {
  return deriveRollup(BUILD_FIELDS.map((f) => data.build?.[f] ?? "n/a"));
}

function closeValueGetter({ data }) {
  return deriveRollup(CLOSE_FIELDS.map((f) => data.build?.[f] ?? "n/a"));
}

// ---------------------------------------------------------------------------
// Rollup sort comparator
// Priority order for sorting: blocked > in progress > not started > n/a > done
// (done floats to the bottom since it needs no attention)
// ---------------------------------------------------------------------------

const ROLLUP_SORT_ORDER = [
  ROLLUP_STATUS.BLOCKED,
  ROLLUP_STATUS.IN_PROGRESS,
  ROLLUP_STATUS.NOT_STARTED,
  ROLLUP_STATUS.NA,
  ROLLUP_STATUS.DONE,
];

function rollupComparator(a, b) {
  return ROLLUP_SORT_ORDER.indexOf(a) - ROLLUP_SORT_ORDER.indexOf(b);
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const columnDefs = [
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
  },
  {
    headerName: "Artist",
    field: "artist",
    flex: 1,
    cellRenderer: ArtistNameRenderer,
  },
  {
    headerName: "Multi",
    headerClass: "ag-header-cell-center",
    field: "isMulti",
    cellRenderer: CheckboxRenderer,
    cellClass: "ag-center-aligned-cell",
    width: 70,
    minWidth: 70,
    maxWidth: 70,
    suppressAutoSize: true,
  },
  {
    colId: "schedule",
    headerComponent: ScheduleHeaderRenderer,
    headerComponentParams: {
      enableSorting: true,
    },
    headerClass: "ag-header-cell-center",
    cellClass: "ag-center-aligned-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    sortable: true,
    suppressAutoSize: true,
    // AG Grid only re-renders a cell when this valueGetter's return value
    // changes (see ag-grid-community's rowNode.updateData) — the renderer
    // also needs to know releaseMode, so it has to ride along in the value
    // itself, not just be read separately off `data` in the cellRenderer.
    // Returning a fresh object every call means it's always treated as
    // "changed" and the cell always redraws, which is what we want here.
    valueGetter: ({ data }) => {
      const s = data?.schedule;
      const d = s?.announceDateTime ?? s?.onSaleDateTime;
      return {
        time: d ? new Date(d).getTime() : null,
        releaseMode: s?.releaseMode ?? "asap",
      };
    },
    cellRenderer: ScheduleRenderer,
    comparator: (a, b, _nodeA, _nodeB, isDescending) => {
      const at = a?.time ?? null;
      const bt = b?.time ?? null;
      if (at === null && bt === null) return 0;
      if (at === null) return 1; // nulls always sink regardless of direction
      if (bt === null) return -1;
      return isDescending ? bt - at : at - bt;
    },
  },
  {
    headerName: "s",
    headerClass: "ag-header-cell-center",
    valueGetter: setupValueGetter,
    cellRenderer: RollupCellRenderer,
    cellRendererParams: { phase: "setup" },
    comparator: rollupComparator,
    cellClass: "ag-center-aligned-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    sortable: true,
    suppressAutoSize: true,
  },
  {
    headerName: "b",
    headerClass: "ag-header-cell-center",
    valueGetter: buildValueGetter,
    cellRenderer: RollupCellRenderer,
    cellRendererParams: { phase: "build" },
    comparator: rollupComparator,
    cellClass: "ag-center-aligned-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    sortable: true,
    suppressAutoSize: true,
  },
  {
    headerName: "c",
    headerClass: "ag-header-cell-center",
    valueGetter: closeValueGetter,
    cellRenderer: RollupCellRenderer,
    cellRendererParams: { phase: "close" },
    comparator: rollupComparator,
    cellClass: "ag-center-aligned-cell",
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    sortable: true,
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
    suppressAutoSize: true,
  },
];
