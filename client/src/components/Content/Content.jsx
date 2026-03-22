import { useCallback, useEffect, useRef } from "react";
import useShowsStore from "../../store/useShowsStore.js";
import ClientArea from "../ClientArea/ClientArea";
import Grid from "../Grid/Grid";
import styles from "./Content.module.css";

const Content = () => {
  const gridWidth = useShowsStore((s) => s.gridWidth);
  const setGridWidth = useShowsStore((s) => s.setGridWidth);
  const gridWrapperRef = useRef(null);
  const dragging = useRef(false);

  const onMouseMove = useCallback(
    (e) => {
      if (dragging.current) {
        const newWidth = e.clientX;
        if (newWidth > 450) {
          setGridWidth(newWidth);
          // Sync store to actual rendered width after CSS clamp
          requestAnimationFrame(() => {
            if (gridWrapperRef.current) {
              setGridWidth(gridWrapperRef.current.offsetWidth);
            }
          });
        }
      }
    },
    [setGridWidth]
  );

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
      <div ref={gridWrapperRef} className={styles.gridWrapper} style={{ width: gridWidth }}>
        <Grid />
      </div>
      <div className={styles.dragHandle} onMouseDown={onMouseDown}></div>
      <ClientArea />
    </main>
  );
};

export default Content;
