import AddTaskModal from "@modals/AddTaskModal/AddTaskModal";
import SvgAddTask from "@svg/add-task_google.svg?react";
import SvgCheckboxChecked from "@svg/check-box--checked_google.svg?react";
import SvgCopyOneCell from "@svg/copy-one-cell_rg.svg?react";
import SvgCopyTwoCells from "@svg/copy-two-cells_rg.svg?react";
import SvgFolderClosed from "@svg/folder--closed_google.svg?react";
import SvgFolderOpen from "@svg/folder--open_google.svg?react";
import { useState } from "react";
import gridStyles from "./Grid.module.css";

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

export default AddTaskIconRenderer;
