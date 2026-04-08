import BadgeSelect from "@components/Content/shared/BadgeSelect/BadgeSelect.jsx";
import BadgeSelectAdapter from "@components/Content/shared/BadgeSelect/BadgeSelectAdapter.jsx";
import { useShows } from "@hooks/useShows";
import { useDeleteTask, useTaskEvents, useTasks, useUpdateTask } from "@hooks/useTasks";
import AddTaskModal from "@modals/AddTaskModal/AddTaskModal";
import ConfirmModal from "@modals/ConfirmModal/ConfirmModal";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITY,
  TASK_STATUS,
} from "@shared/constants/tasks.js";
import useRavenStore from "@store/useRavenStore";
import SvgAddTask from "@svg/add-task_google.svg?react";
import SvgDelete from "@svg/delete_google.svg?react";
import SvgRefresh from "@svg/refresh_google.svg?react";
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState } from "react";
import BadgeSelectEditor from "./BadgeSelectEditor/BadgeSelectEditor";
import styles from "./TasksView.module.css";
import TextEditor from "./TextEditor/TextEditor";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark).withParams({
  cellHorizontalPadding: 8,
  borderColor: "#3d2f8a",
  rowBorder: { color: "#1d1828", width: 1 },
  headerBackgroundColor: "#110e1a",
  headerTextColor: "#f0e8d0",
  oddRowBackgroundColor: "#303030",
  rowHoverColor: "#2e2648",
  selectedRowBackgroundColor: "#4a3d78",
  foregroundColor: "#e3e3e3",
  iconColor: "#e3e3e3",
});

// ─── cell renderers ───────────────────────────────────────────────────────────

export function StatusCell({ value }) {
  if (!value) return null;
  return (
    <BadgeSelect
      value={value}
      options={TASK_STATUS}
      labels={STATUS_LABEL}
      variant="status"
      readonly
    />
  );
}

export function PriorityCell({ value }) {
  if (!value) return null;
  return (
    <BadgeSelect
      value={value}
      options={TASK_PRIORITY}
      labels={PRIORITY_LABEL}
      variant="priority"
      readonly
    />
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

const DescriptionCell = ({ value }) => {
  return <div className={styles.descriptionCell}>{value}</div>;
};

const NotesCell = ({ value }) => {
  return <div className={styles.notesCell}>{value}</div>;
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
  return (
    <div className={styles.actions}>
      <button
        className={styles.actionBtn}
        data-danger
        onClick={() => context.onDelete(data)}
        title="Delete"
      >
        <SvgDelete />
      </button>
    </div>
  );
};

// ─── TasksView ────────────────────────────────────────────────────────────────

export default function TasksView() {
  useTaskEvents();
  const updateTask = useUpdateTask();
  const gridRef = useRef();

  const { filterStatus, filterPriority, filterLinked } = useRavenStore();

  // ── modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [preloadFolderId, setPreloadFolderId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // ── data
  const { data: shows = [] } = useShows();
  const deleteTask = useDeleteTask();

  const linkedParam = { all: undefined, linked: "true", general: "false" }[filterLinked];

  const queryParams = {
    linked: linkedParam,
    status: filterStatus.length > 0 ? filterStatus.join(",") : undefined,
    priority: filterPriority.length > 0 ? filterPriority.join(",") : undefined,
  };

  const { data: tasks = [], isLoading, refetch } = useTasks(queryParams);

  // ── show lookup map
  const showMap = useMemo(() => {
    const map = {};
    for (const s of shows ?? []) {
      if (s.googleFolderId) map[s.googleFolderId] = s;
    }
    return map;
  }, [shows]);

  // ── row data
  const rowData = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      googleFolderId: t.showFolderId,
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
  }, [tasks, showMap]);

  // ── modal handlers
  const openCreate = useCallback((showFolderId = null) => {
    setEditingTask(null);
    setPreloadFolderId(showFolderId);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((task) => {
    setPendingDelete(task);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    await deleteTask.mutateAsync(pendingDelete._id);
    setPendingDelete(null);
  }, [pendingDelete, deleteTask]);

  const handleCellClicked = useCallback((e) => {
    if (e.colDef.field === "_showArtist" && e.data?.googleFolderId) {
      window.open(
        `https://drive.google.com/drive/folders/${e.data.googleFolderId}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }, []);

  // ── column defs
  const columnDefs = useMemo(
    () => [
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
        maxWidth: 300,
      },
      {
        field: "description",
        headerName: "Description",
        flex: 1,
        minWidth: 220,
        cellRenderer: DescriptionCell,
        cellEditor: TextEditor,
        cellEditorParams: (params) => ({
          onSave: (newVal) => updateTask.mutateAsync({ id: params.data._id, description: newVal }),
        }),
        editable: true,
        singleClickEdit: true,
        sortable: true,
        resizable: true,
        autoHeight: true,
        wrapText: true,
      },
      {
        field: "priority",
        headerName: "Priority",
        headerClass: "ag-header-cell-center",
        cellClass: "ag-center-aligned-cell",
        cellRenderer: PriorityCell,
        cellEditor: BadgeSelectAdapter,
        cellEditorParams: (params) => ({
          options: TASK_PRIORITY,
          labels: PRIORITY_LABEL,
          variant: "priority",
          onSelect: (newVal) => updateTask.mutateAsync({ id: params.data._id, priority: newVal }),
        }),
        comparator: (valueA, valueB) => {
          const order = TASK_PRIORITY;
          return order.indexOf(valueA) - order.indexOf(valueB);
        },
        editable: true,
        singleClickEdit: true,
        sortable: true,
        width: 110,
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1,
        minWidth: 220,
        cellRenderer: NotesCell,
        cellEditor: TextEditor,
        cellEditorParams: (params) => ({
          onSave: (newVal) => updateTask.mutateAsync({ id: params.data._id, notes: newVal }),
        }),
        editable: true,
        singleClickEdit: true,
        resizable: true,
        autoHeight: true,
        wrapText: true,
      },
      {
        field: "status",
        headerName: "Status",
        headerClass: "ag-header-cell-center",
        cellClass: "ag-center-aligned-cell",
        cellRenderer: StatusCell,
        cellEditor: BadgeSelectAdapter,
        cellEditorParams: (params) => ({
          options: TASK_STATUS,
          labels: STATUS_LABEL,
          variant: "status",
          onSelect: (newVal) => updateTask.mutateAsync({ id: params.data._id, status: newVal }),
        }),
        comparator: (valueA, valueB) => {
          const order = TASK_STATUS;
          return order.indexOf(valueA) - order.indexOf(valueB);
        },
        editable: true,
        singleClickEdit: true,
        sortable: true,
        width: 130,
      },
      {
        field: "_updatedLabel",
        headerName: "Last Updated",
        width: 160,
        cellRenderer: UpdatedDateCell,
      },
      {
        headerName: "",
        cellRenderer: ActionsCell,
        width: 60,
        pinned: "right",
        suppressMovable: true,
      },
    ],
    [updateTask]
  );

  const defaultColDef = useMemo(() => ({ resizable: false, filter: false, sortable: true }), []);

  const getRowId = useCallback(({ data }) => data._id, []);

  const context = useMemo(() => ({ onDelete: handleDelete }), [handleDelete]);

  // ── show label for modal
  const modalShowLabel = useMemo(() => {
    const folderId = editingTask?.showFolderId ?? preloadFolderId;
    if (!folderId) return null;
    const show = showMap[folderId];
    if (!show) return folderId;
    const date = show.date ? new Date(show.date).toISOString().split("T")[0] : "";
    const artist = show.artist ?? show.billing?.mainBilling ?? "";
    return [date, artist].filter(Boolean).join(" ") || folderId;
  }, [editingTask, preloadFolderId, showMap]);

  return (
    <div className={styles.root}>
      {/* ── toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.rightActions}>
          <button className="primary" onClick={() => openCreate()}>
            <SvgAddTask />
            New Task
          </button>
          <button className="primary" onClick={() => refetch()}>
            <SvgRefresh />
            Reload
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
            onCellClicked={handleCellClicked}
            getRowId={getRowId}
            context={context}
            initialState={{
              sort: {
                sortModel: [{ colId: "priority", sort: "asc" }],
              },
            }}
            animateRows
            suppressCellFocus
          />
        </div>
      )}

      {/* ── modals */}
      <AddTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={editingTask}
        showFolderId={editingTask?.showFolderId ?? preloadFolderId}
        showLabel={modalShowLabel}
      />

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete task?"
        message={pendingDelete ? `"${pendingDelete.description}"` : ""}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        danger
      />
    </div>
  );
}
