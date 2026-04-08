import Banner from "@components/Content/shared/Banner/Banner.jsx";
import BuildProperties from "@components/Content/shared/BuildProperties/BuildProperties.jsx";
import { useShowById } from "@hooks/useShowById.js";
import { useParams } from "react-router-dom";
import styles from "./BuildClientArea.module.css";

const BuildClientArea = () => {
  const { showFolderId } = useParams();
  const { data: show, isError, error } = useShowById(showFolderId, { retry: false });

  if (!showFolderId) {
    return <div className={styles.empty}>Select a show from the roster.</div>;
  }

  return (
    <div className={styles.clientArea}>
      {isError ? (
        <div className={styles.errorMessage}>
          Couldn't load that show: {error?.message ?? "unknown error."}
        </div>
      ) : (
        <>
          {show && <Banner show={show} />}
          <BuildProperties show={show} />
        </>
      )}
    </div>
  );
};

export default BuildClientArea;
