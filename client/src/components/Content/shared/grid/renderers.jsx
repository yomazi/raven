import AddTaskModal from "@modals/AddTaskModal/AddTaskModal";
import { ROLLUP_STATUS } from "@shared/constants/builds.js";
import SvgAddTask from "@svg/add-task_google.svg?react";
import SvgCheckboxChecked from "@svg/check-box--checked_google.svg?react";
import SvgCopyOneCell from "@svg/copy-one-cell_rg.svg?react";
import SvgCopyTwoCells from "@svg/copy-two-cells_rg.svg?react";
import SvgFolderClosed from "@svg/folder--closed_google.svg?react";
import SvgFolderOpen from "@svg/folder--open_google.svg?react";
import SvgSchedule from "@svg/schedule_google.svg?react";
import { useState } from "react";
import gridStyles from "./Grid.module.css";

import { useEffect } from "react";

export const RowNumberRenderer = (params) => {
  return <div className={gridStyles.rowNumberCell}>{params.value}</div>;
};

export const FolderIconRenderer = () => {
  return (
    <div className={gridStyles.folderLinkCell}>
      <SvgFolderClosed className={gridStyles.iconFolderClosed} />
      <SvgFolderOpen className={gridStyles.iconFolderOpen} />
    </div>
  );
};

export const ArtistNameRenderer = (params) => {
  return <div className={gridStyles.artistNameCell}>{params.value}</div>;
};

export const DateRenderer = (params) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return <div className={gridStyles.dateCell}>{formatDate(params.value)}</div>;
};

export const CopyDateAndArtistLinkRenderer = () => {
  return (
    <div className={gridStyles.copyDateAndArtistLinkCell}>
      <SvgCopyTwoCells />
    </div>
  );
};

export const CopyArtistLinkRenderer = () => {
  return (
    <div className={gridStyles.copyArtistLinkCell}>
      <SvgCopyOneCell />
    </div>
  );
};

export const CheckboxRenderer = (params) => {
  return (
    <div className={gridStyles.checkboxCell}>
      {params.value ? <SvgCheckboxChecked className={gridStyles.checkboxChecked} /> : null}
    </div>
  );
};

export const AddTaskIconRenderer = ({ data }) => {
  const [open, setOpen] = useState(false);

  const folderId = data?.googleFolderId;

  const artist = data?.artist ?? data?.billing?.mainBilling ?? "";
  const date = data?.date
    ? new Date(data.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
  const showLabel = [date, artist].filter(Boolean).join(" · ");

  return (
    <>
      <div
        className={gridStyles.addTaskCell}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <SvgAddTask />
      </div>

      <AddTaskModal
        open={open}
        onOpenChange={setOpen}
        showFolderId={folderId}
        showLabel={showLabel}
      />
    </>
  );
};

export const ScheduleHeaderRenderer = ({ progressSort, column }) => {
  const [sort, setSort] = useState(column.getSort());

  useEffect(() => {
    const listener = () => setSort(column.getSort());
    column.addEventListener("sortChanged", listener);
    return () => column.removeEventListener("sortChanged", listener);
  }, [column]);

  console.log(`sort: ${sort}`);

  return (
    <div
      className={`${gridStyles.scheduleHeaderCell} ${!sort ? gridStyles.scheduleHeaderCellSmall : ""}`}
      onClick={() => progressSort()}
    >
      <SvgSchedule />
      {sort && (
        <span
          className={`ag-icon ${sort === "asc" ? "ag-icon-asc" : "ag-icon-desc"}`}
          role="presentation"
          unselectable="on"
        ></span>
      )}
    </div>
  );
};

export const ScheduleRenderer = ({ value }) => {
  return (
    <>
      {value != null && (
        <div className={gridStyles.scheduleCell}>
          <SvgSchedule />
        </div>
      )}
    </>
  );
};

export const RollupCellRenderer = ({ value, phase }) => {
  if (!value) return null;
  const statusMap = {
    [ROLLUP_STATUS.NOT_STARTED]: "to_do",
    [ROLLUP_STATUS.IN_PROGRESS]: "in_progress",
    [ROLLUP_STATUS.BLOCKED]: "blocked",
    [ROLLUP_STATUS.DONE]: "done",
    [ROLLUP_STATUS.NA]: "done",
  };
  const status = statusMap[value] ?? "to_do";
  const label = `${phase} status: ${value === ROLLUP_STATUS.NA ? "done" : value}`;

  return <div className={gridStyles.rollupDot} data-status={status} title={label} />;
};

export default AddTaskIconRenderer;
