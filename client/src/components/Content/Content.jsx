import { useCallback, useEffect, useRef, useState } from "react";
import ClientArea from "../ClientArea/ClientArea";
import Grid from "../Grid/Grid";
import styles from "./Content.module.css";

const Content = () => {
  const [gridWidth, setGridWidth] = useState(750);
  const dragging = useRef(false);

  const onMouseMove = useCallback((e) => {
    if (dragging.current) {
      const newWidth = e.clientX;
      if (newWidth > 450) {
        setGridWidth(newWidth);
      }
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true }); // self-removing
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <main className={styles.content}>
      <div className={styles.gridWrapper} style={{ width: gridWidth }}>
        <Grid />
      </div>
      <div className={styles.dragHandle} onMouseDown={onMouseDown}></div>
      <ClientArea />
    </main>
  );
};

export default Content;
