import useRavenStore from "@store/useRavenStore.js";
import { useCallback, useEffect, useRef } from "react";
import styles from "./Content.module.css";

const SplitPane = ({ resizable, leftPane, rightPane }) => {
  const resizableLeftPaneWidth = useRavenStore((s) => s.leftPaneWidth);
  const setLeftPaneWidth = useRavenStore((s) => s.setLeftPaneWidth);
  const leftPaneWrapperRef = useRef(null);
  const dragging = useRef(false);
  const leftPaneWidth = resizable ? resizableLeftPaneWidth : "auto";

  const onMouseMove = useCallback(
    (e) => {
      if (dragging.current) {
        const newWidth = e.clientX;
        if (newWidth > 450) {
          setLeftPaneWidth(newWidth);
          // Sync store to actual rendered width after CSS clamp
          requestAnimationFrame(() => {
            if (leftPaneWrapperRef.current) {
              setLeftPaneWidth(leftPaneWrapperRef.current.offsetWidth);
            }
          });
        }
      }
    },
    [setLeftPaneWidth]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  const onMouseDown = useCallback(() => {
    if (!resizable) return;

    dragging.current = true;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true }); // self-removing
  }, [resizable, onMouseMove, onMouseUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <main className={styles.content}>
      <div
        ref={leftPaneWrapperRef}
        className={`${styles.leftPaneWrapper}${resizable ? ` ${styles.leftPaneWrapperResizable}` : ""}`}
        style={{ width: leftPaneWidth }}
      >
        {leftPane}
      </div>
      <div
        className={`${styles.splitter}${resizable ? ` ${styles.dragHandle}` : ""}`}
        onMouseDown={onMouseDown}
      ></div>
      {rightPane}
    </main>
  );
};

export default SplitPane;
