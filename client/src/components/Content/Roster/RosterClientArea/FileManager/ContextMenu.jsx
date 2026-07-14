import { useEffect, useRef, useState } from "react";
import styles from "./FileManager.module.css";

const MENU_WIDTH = 170;

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    const maxLeft = window.innerWidth - MENU_WIDTH - 8;
    const maxTop = window.innerHeight - items.length * 30 - 16;
    setPosition({
      left: Math.min(x, Math.max(8, maxLeft)),
      top: Math.min(y, Math.max(8, maxTop)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.contextMenu}
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className={styles.contextMenuItem}
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
