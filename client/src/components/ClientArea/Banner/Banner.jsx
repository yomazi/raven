import SvgFolderClosed from "../../../assets/svg/folder_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
import SvgFolderOpen from "../../../assets/svg/folder_open_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg?react";
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

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const Banner = ({ show = {} }) => {
  const formattedDate = formatDate(show.date);

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
        <div className={styles.artist}>{show.artist}</div>
        <div className={styles.date}>{formattedDate}</div>
      </article>
      <button className={styles.copyButton} onClick={handleCopy} title="Copy to clipboard">
        <CopyIcon />
      </button>
    </section>
  );
};

export default Banner;
