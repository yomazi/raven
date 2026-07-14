import SvgFile from "@svg/file_google.svg?react";
import SvgFolderClosed from "@svg/folder--closed_google.svg?react";
import SvgFolderOpen from "@svg/folder--open_google.svg?react";
import SvgGoogleDocs from "@svg/google-docs_rg.svg?react";
import SvgGoogleSheets from "@svg/google-sheets_rg.svg?react";
import SvgPdf from "@svg/pdf_rg.svg?react";
import styles from "./FileManager.module.css";

const MIME_ICONS = {
  "application/pdf": SvgPdf,
  "application/vnd.google-apps.document": SvgGoogleDocs,
  "application/vnd.google-apps.spreadsheet": SvgGoogleSheets,
};

export default function FileIcon({ mimeType, isFolder, isOpen }) {
  if (isFolder) {
    const Icon = isOpen ? SvgFolderOpen : SvgFolderClosed;
    return <Icon className={styles.icon} />;
  }

  const Icon = MIME_ICONS[mimeType] ?? SvgFile;
  return <Icon className={styles.icon} />;
}
