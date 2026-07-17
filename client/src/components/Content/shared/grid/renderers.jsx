import AddTaskModal from "@modals/AddTaskModal/AddTaskModal";
import RollupDot from "@components/Content/shared/RollupDot/RollupDot.jsx";
import SvgAddTask from "@svg/add-task_google.svg?react";
import SvgCheckboxChecked from "@svg/check-box--checked_google.svg?react";
import SvgCopyOneCell from "@svg/copy-one-cell_rg.svg?react";
import SvgContract from "@svg/contract_google.svg?react";
import SvgCopyTwoCells from "@svg/copy-two-cells_rg.svg?react";
import SvgSchedule from "@svg/schedule_google.svg?react";
import SvgUnknown from "@svg/unknown_google.svg?react";
import { useState } from "react";
import gridStyles from "./Grid.module.css";

import { useEffect } from "react";

export const RowNumberRenderer = (params) => {
  return <div className={gridStyles.rowNumberCell}>{params.value}</div>;
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

function haveAllScheduleDatesPassed(schedule) {
  const now = Date.now();
  const dates = [schedule?.announceDateTime, schedule?.onSaleDateTime]
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  return dates.length > 0 && dates.every((t) => t < now);
}

// True if any presale on the show hasn't ended yet (upcoming or currently
// running). A presale with no endDateTime set is treated as still relevant,
// since we can't tell it's over.
function hasActivePresale(schedule) {
  const presales = schedule?.presales ?? [];
  if (presales.length === 0) return false;
  const now = Date.now();
  return presales.some((p) => !p.endDateTime || new Date(p.endDateTime).getTime() >= now);
}

export const ScheduleRenderer = ({ value, data }) => {
  const releaseMode = value?.releaseMode ?? "asap";

  if (releaseMode === "tbd") {
    return (
      <div className={gridStyles.scheduleCell} title="Release TBD">
        <SvgUnknown />
      </div>
    );
  }

  // Dates aren't cleared when a show switches modes (schedule data is
  // preserved across mode changes), so a show can still have leftover
  // announce/on-sale dates while marked ASAP — the icon must stay hidden
  // regardless of those lingering values.
  if (releaseMode === "asap") return null;

  if (value?.time == null) return null;

  const allPassed = haveAllScheduleDatesPassed(data?.schedule);
  // An active presale only matters while the schedule itself isn't already
  // past — once everything's past, it's just the dimmed icon as usual.
  const presaleActive =
    !allPassed && releaseMode === "on-schedule" && hasActivePresale(data?.schedule);

  return (
    <div
      className={`${gridStyles.scheduleCell} ${allPassed ? gridStyles.scheduleCellPast : ""} ${presaleActive ? gridStyles.scheduleCellPresale : ""}`}
      title={presaleActive ? "Has an active presale" : undefined}
    >
      <SvgSchedule />
    </div>
  );
};

export const RollupCellRenderer = ({ value, phase }) => <RollupDot value={value} phase={phase} />;

export const ContractHeaderRenderer = () => {
  return (
    <div className={gridStyles.contractHeaderCell}>
      <SvgContract />
    </div>
  );
};

export default AddTaskIconRenderer;
