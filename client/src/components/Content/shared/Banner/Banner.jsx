import RollupDot from "@components/Content/shared/RollupDot/RollupDot.jsx";
import { deriveAllRollups } from "@shared/functions/builds.js";
import SvgContentCopy from "@svg/content-copy_google.svg?react";
import SvgFolderClosed from "@svg/folder--closed_google.svg?react";
import SvgFolderOpen from "@svg/folder--open_google.svg?react";
import styles from "./Banner.module.css";

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `(${date})`;
};

const Banner = ({ show = {} }) => {
  const formattedDate = formatDate(show.date);
  const rollups = deriveAllRollups(show.build);

  const handleClick = () => {
    const url = `https://drive.google.com/drive/folders/${show.googleFolderId}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${show.artist} ${formattedDate}`);
  };

  return (
    <section className={styles.banner}>
      <article className={styles.bannerContainer} onClick={handleClick}>
        <div className={styles.folderContainer}>
          <div className={styles.folderIcon}>
            <SvgFolderClosed className={styles.iconFolderClosed} />
            <SvgFolderOpen className={styles.iconFolderOpen} />
          </div>
        </div>
        <div className={`${styles.artist} ${styles.truncate}`}>{show.artist}</div>
        <div className={`${styles.date} ${styles.truncate}`}>{formattedDate}</div>
      </article>
      <button className={styles.copyButton} onClick={handleCopy} title="Copy to clipboard">
        <SvgContentCopy />
      </button>
      <div className={styles.rollups}>
        <RollupDot value={rollups.setup} phase="setup" />
        <RollupDot value={rollups.build} phase="build" />
        <RollupDot value={rollups.close} phase="close" />
      </div>
    </section>
  );
};

export default Banner;
