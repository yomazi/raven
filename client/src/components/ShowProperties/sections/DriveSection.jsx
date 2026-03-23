import styles from "./Section.module.css";
import SectionHeader from "./SectionHeader.jsx";

const DriveLink = ({ label, id, type = "folders" }) => {
  if (!id)
    return (
      <>
        <span className={styles.label}>{label}</span>
        <span className={styles.valueDim}>—</span>
      </>
    );

  const url = `https://drive.google.com/drive/${type}/${id}`;
  return (
    <>
      <span className={styles.label}>{label}</span>
      <a className={styles.driveLink} href={url} target="_blank" rel="noopener noreferrer">
        Open ↗
      </a>
    </>
  );
};

export default function DriveSection({ show }) {
  const { drive } = show;

  return (
    <section id="drive" className={styles.section}>
      <SectionHeader title="Drive" />
      <div className={styles.readOnlyGrid}>
        <DriveLink label="Show Folder" id={show.googleFolderId} />
        <DriveLink label="Marketing Assets Folder" id={drive?.folderIds?.marketingAssets} />
        <DriveLink
          label="Settlement Workbook"
          id={drive?.spreadsheetIds?.settlementWorkbook}
          type="file"
        />
        <DriveLink
          label="Marketing Assets Info"
          id={drive?.documentIds?.marketingAssetsInfo}
          type="file"
        />
      </div>

      {drive?.spreadsheetIds?.preExistingSheets?.length > 0 && (
        <>
          <h4 className={styles.subSectionTitle}>Pre-existing Sheets</h4>
          <div className={styles.readOnlyGrid}>
            {drive.spreadsheetIds.preExistingSheets.map((sheet) => (
              <DriveLink key={sheet.id} label={sheet.name} id={sheet.id} type="file" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
