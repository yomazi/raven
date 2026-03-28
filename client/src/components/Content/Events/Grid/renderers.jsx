import SvgCheckboxChecked from "@svg/check-box--checked_google.svg?react";
import SvgCopyOneCell from "@svg/copy-one-cell_rg.svg?react";
import SvgCopyTwoCells from "@svg/copy-two-cells_rg.svg?react";
import SvgFolderClosed from "@svg/folder--closed_google.svg?react";
import SvgFolderOpen from "@svg/folder--open_google.svg?react";
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
