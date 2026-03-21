import SvgCheckboxChecked from "../../assets/svg/check_box_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import SvgCopyOneCell from "../../assets/svg/copy-one-cell.svg?react";
import SvgCopyTwoCells from "../../assets/svg/copy-two-cells.svg?react";
import SvgFolderClosed from "../../assets/svg/folder_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import SvgFolderOpen from "../../assets/svg/folder_open_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import styles from "./Grid.module.css";

export const FolderIconRenderer = () => {
  return (
    <div className={styles.folderLinkCell}>
      <SvgFolderClosed className={styles.iconFolderClosed} />
      <SvgFolderOpen className={styles.iconFolderOpen} />
    </div>
  );
};

export const ArtistNameRenderer = (params) => {
  return <div className={styles.artistNameCell}>{params.value}</div>;
};

export const DateRenderer = (params) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return <div className={styles.dateCell}>{formatDate(params.value)}</div>;
};

export const CopyDateAndArtistLinkRenderer = () => {
  return (
    <div className={styles.copyDateAndArtistLinkCell}>
      <SvgCopyTwoCells className={styles.shortText} />
    </div>
  );
};

export const CopyArtistLinkRenderer = () => {
  return (
    <div className={styles.copyArtistLinkCell}>
      <SvgCopyOneCell className={styles.shortText} />
    </div>
  );
};

export const CheckboxRenderer = (params) => {
  return (
    <div className={styles.checkboxCell}>
      {params.value ? <SvgCheckboxChecked className={styles.checkboxChecked} /> : null}
    </div>
  );
};
