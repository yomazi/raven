import { useShows } from "@hooks/useShows";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
  useDeleteTask,
  useTaskEvents,
  useTasks,
} from "@hooks/useTasks";
import AddTaskModal from "@modals/AddTaskModal/AddTaskModal";
import SvgAddTask from "@svg/add-task_google.svg?react";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./TasksView.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams({
  cellHorizontalPadding: 8,

  // Chrome
  borderColor: "#3d2f8a", // --color-wyrd-dim
  rowBorder: { color: "#1d1828", width: 1 }, // --color-dusk

  // Header
  headerBackgroundColor: "#110e1a", // --color-void
  headerTextColor: "#f0e8d0", // --color-moonlight

  // Rows
  oddRowBackgroundColor: "#303030",
  rowHoverColor: "#2e2648", // --color-stone
  selectedRowBackgroundColor: "#4a3d78", // --color-wyrd-dim

  // Text
  foregroundColor: "#e3e3e3",

  // Icons
  iconColor: "#e3e3e3",
});
// ─── cell renderers ──────────────────────────────────────────────────────────

export function StatusCell({ value }) {
  if (!value) return null;
  return (
    <div className={`${styles.taskBadge} ${styles[`status--${value}`]}`}>
      {STATUS_LABEL[value] ?? value}
    </div>
  );
}

// PriorityBadge.jsx
export function PriorityCell({ value }) {
  if (!value) return null;
  return (
    <div className={`${styles.taskBadge} ${styles[`priority--${value}`]}`}>
      {PRIORITY_LABEL[value] ?? value}
    </div>
  );
}

const ShowDateCell = ({ value }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return <div className={styles.dateCell}>{formatDate(value)}</div>;
};

const ShowArtistCell = ({ value }) => {
  return <div className={styles.artistCell}>{value}</div>;
};

const DescriptionCell = ({ value, context }) => {
  const isGrouped = context?.viewMode === "grouped";

  return (
    <div className={`${styles.descriptionCell} ${isGrouped ? styles.descriptionCellGrouped : ""}`}>
      {value}
    </div>
  );
};

const UpdatedDateCell = ({ value }) => {
  if (!value) return <div className={styles.dateCell} />;
  const date = new Date(value);
  const datePart = date.toISOString().split("T")[0];
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return (
    <div className={styles.dateCell}>
      {datePart} {timePart}
    </div>
  );
};

const ActionsCell = ({ data, context }) => {
  if (data?._isGroupHeader) return null;
  return (
    <div className={styles.actions}>
      <button className={styles.actionBtn} onClick={() => context.onEdit(data)} title="Edit">
        ✎
      </button>
      <button
        className={styles.actionBtn}
        data-danger
        onClick={() => context.onDelete(data)}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
};
// ─── helpers ─────────────────────────────────────────────────────────────────

function buildShowLabel(show) {
  if (!show) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const date = show.date ? formatDate(show.date) : "";
  const artist = show.artist ?? show.billing?.mainBilling ?? "";
  return [date, artist].filter(Boolean).join(" - ");
}

// ─── TasksView ───────────────────────────────────────────────────────────────

export default function TasksView() {
  useTaskEvents();

  const gridRef = useRef();

  // ── view state
  const [viewMode, setViewMode] = useState("grouped"); // 'flat' | 'grouped'
  const [filterLinked, setFilterLinked] = useState("all"); // 'all' | 'true' | 'false'
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const sortField = "updatedAt"; // default sort field is "updatedAt"

  // ── modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [preloadFolderId, setPreloadFolderId] = useState(null);

  // ── data
  const { data: shows = [] } = useShows();
  const deleteTask = useDeleteTask();

  const queryParams = {
    sort: sortField,
    order: "desc",
    linked: filterLinked === "all" ? undefined : filterLinked,
    status: filterStatus || undefined,
    priority: filterPriority || undefined,
  };

  const { data: tasks = [], isLoading } = useTasks(queryParams);

  // ── show lookup map
  const showMap = useMemo(() => {
    const map = {};
    for (const s of shows ?? []) {
      if (s.googleFolderId) map[s.googleFolderId] = s;
    }
    return map;
  }, [shows]);

  // ── row data: flat or grouped
  const rowData = useMemo(() => {
    if (viewMode === "flat") {
      return tasks.map((t) => ({
        ...t,
        _showDate: t.showFolderId
          ? showMap[t.showFolderId]?.date
            ? new Date(showMap[t.showFolderId].date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : ""
          : "",
        _showArtist: t.showFolderId
          ? (showMap[t.showFolderId]?.artist ?? showMap[t.showFolderId]?.billing?.mainBilling ?? "")
          : "",
        _updatedLabel: t.updatedAt,
      }));
    }

    // Grouped mode: inject show-header rows, unlinked at bottom
    const linked = tasks.filter((t) => t.showFolderId);
    const unlinked = tasks.filter((t) => !t.showFolderId);

    // Group linked tasks by show, ordered by show performance date asc
    const groups = {};
    for (const t of linked) {
      if (!groups[t.showFolderId]) groups[t.showFolderId] = [];
      groups[t.showFolderId].push(t);
    }

    const sortedFolderIds = Object.keys(groups).sort((a, b) => {
      const dateA = showMap[a]?.date ? new Date(showMap[a].date) : new Date(0);
      const dateB = showMap[b]?.date ? new Date(showMap[b].date) : new Date(0);
      return dateA - dateB;
    });

    const rows = [];

    for (const folderId of sortedFolderIds) {
      const show = showMap[folderId];
      const label = buildShowLabel(show) ?? "Unknown Show";
      rows.push({ _isGroupHeader: true, _groupLabel: label, _id: `header-${folderId}` });
      for (const t of groups[folderId]) {
        rows.push({
          ...t,
          _showLabel: label,
          _updatedLabel: t.updatedAt,
        });
      }
    }

    if (unlinked.length) {
      rows.push({ _isGroupHeader: true, _groupLabel: "", _id: "header-general" });
      for (const t of unlinked) {
        rows.push({
          ...t,
          _showLabel: null,
          _updatedLabel: t.updatedAt,
        });
      }
    }

    return rows;
  }, [tasks, viewMode, showMap]);

  // ── column defs
  const columnDefs = useMemo(() => {
    const resizableInFlatMode = viewMode === "flat";
    const shared = [
      {
        field: "description",
        headerName: "Description",
        flex: 1,
        minWidth: 220,
        cellRenderer: DescriptionCell,
        resizable: resizableInFlatMode,
        autoHeight: true,
        wrapText: true,
      },
      {
        field: "priority",
        headerName: "Priority",
        headerClass: "ag-header-cell-center",
        cellClass: "ag-center-aligned-cell",
        cellRenderer: PriorityCell,
        width: 110,
      },
      {
        field: "status",
        headerName: "Status",
        headerClass: "ag-header-cell-center",
        cellClass: "ag-center-aligned-cell",
        cellRenderer: StatusCell,
        width: 130,
      },
      {
        field: "_updatedLabel",
        headerName: "Last Updated",
        width: 190,
        cellRenderer: UpdatedDateCell,
      },
      {
        headerName: "",
        cellRenderer: ActionsCell,
        width: 80,
        pinned: "right",
        suppressMovable: true,
      },
    ];

    if (viewMode === "flat") {
      return [
        {
          field: "_showDate",
          headerName: "Date",
          cellRenderer: ShowDateCell,
          sortable: true,
          width: 100,
          minWidth: 100,
          maxWidth: 100,
        },
        {
          field: "_showArtist",
          headerName: "Artist",
          cellRenderer: ShowArtistCell,
          sortable: true,
          resizable: true,
          flex: 2,
          minWidth: 150,
          maxWidth: 400,
        },
        ...shared,
      ];
    }

    return shared;
  }, [viewMode]);

  const defaultColDef = useMemo(
    () => ({
      resizable: false,
      filter: false,
      sortable: viewMode === "flat",
    }),
    [viewMode]
  );

  const getRowId = useCallback(({ data }) => data._id ?? data._id, []);

  const getRowClass = useCallback(({ data }) => {
    if (data?._isGroupHeader) return styles.groupHeaderRow;
    return "";
  }, []);

  const isFullWidthRow = useCallback(({ rowNode }) => !!rowNode.data?._isGroupHeader, []);

  const fullWidthCellRenderer = useCallback(
    ({ data }) => (
      <div
        className={`${styles.groupHeader} ${data._groupLabel === "" ? styles.groupHeaderUnlinked : ""}`}
      >
        {data._groupLabel}
      </div>
    ),
    []
  );

  // ── modal handlers
  const openCreate = useCallback((showFolderId = null) => {
    setEditingTask(null);
    setPreloadFolderId(showFolderId);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((task) => {
    setEditingTask(task);
    setPreloadFolderId(null);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (task) => {
      if (!window.confirm(`Delete task: "${task.description}"?`)) return;
      await deleteTask.mutateAsync(task._id);
    },
    [deleteTask]
  );

  const context = useMemo(
    () => ({ viewMode: viewMode, onEdit: openEdit, onDelete: handleDelete }),
    [viewMode, openEdit, handleDelete]
  );

  // ── show label for modal
  const modalShowLabel = useMemo(() => {
    const folderId = editingTask?.showFolderId ?? preloadFolderId;
    if (!folderId) return null;
    return buildShowLabel(showMap[folderId]) ?? folderId;
  }, [editingTask, preloadFolderId, showMap]);

  useEffect(() => {
    if (viewMode === "grouped" && gridRef.current?.api) {
      gridRef.current.api.applyColumnState({
        defaultState: { sort: null },
      });
    }
  }, [viewMode]);

  return (
    <div className={styles.root}>
      {/* ── toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* view mode toggle */}
          <div className={styles.segmented}>
            <button
              className={styles.segment}
              data-active={viewMode === "flat" || undefined}
              onClick={() => setViewMode("flat")}
            >
              Flat
            </button>
            <button
              className={styles.segment}
              data-active={viewMode === "grouped" || undefined}
              onClick={() => setViewMode("grouped")}
            >
              By Show
            </button>
          </div>

          {/* task type filter */}
          <select
            className={styles.filter}
            value={filterLinked}
            onChange={(e) => setFilterLinked(e.target.value)}
          >
            <option value="all">All tasks</option>
            <option value="true">Show-linked</option>
            <option value="false">General</option>
          </select>

          {/* status filter */}
          <select
            className={styles.filter}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {TASK_STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          {/* priority filter */}
          <select
            className={styles.filter}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {TASK_PRIORITY.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.toolbarRight}>
          <button className="primary" onClick={() => openCreate()}>
            <SvgAddTask />
            New Task
          </button>
        </div>
      </div>

      {/* ── grid */}
      {isLoading ? (
        <div className={styles.loading}>Loading tasks…</div>
      ) : (
        <div className={`ag-theme-alpine-dark ${styles.grid}`}>
          <AgGridReact
            ref={gridRef}
            theme={theme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            getRowClass={getRowClass}
            isFullWidthRow={isFullWidthRow}
            fullWidthCellRenderer={fullWidthCellRenderer}
            context={context}
            animateRows
            suppressCellFocus
          />
        </div>
      )}

      {/* ── modal */}
      <AddTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={editingTask}
        showFolderId={editingTask?.showFolderId ?? preloadFolderId}
        showLabel={modalShowLabel}
      />
    </div>
  );
}
