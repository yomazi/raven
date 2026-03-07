import { useRef, useState } from "react";
import ClientArea from "../ClientArea/ClientArea";
import Grid from "../Grid/Grid";
import styles from "./Content.module.css";

const Content = () => {
  const [gridWidth, setGridWidth] = useState(700);
  const dragging = useRef(false);

  const onMouseMove = (e) => {
    if (dragging.current) {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 800) {
        setGridWidth(newWidth);
      }
    }
  };

  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const onMouseDown = () => {
    dragging.current = true;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <main className={styles.content}>
      <div className={styles.gridWrapper} style={{ width: gridWidth }}>
        <Grid />
      </div>
      <div className={styles.dragHandle} onMouseDown={onMouseDown}></div>
      <div className={styles.clientArea}>
        <ClientArea />
      </div>
    </main>
  );
};

export default Content;
