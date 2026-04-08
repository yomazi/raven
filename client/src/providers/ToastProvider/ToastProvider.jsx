// client/src/components/Toast/ToastProvider.jsx

import * as Toast from "@radix-ui/react-toast";
import { useCallback, useRef, useState } from "react";
import { ToastContext } from "./ToastContext.jsx";
import styles from "./ToastProvider.module.css";

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const undoCallbacksRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    delete undoCallbacksRef.current[id];
  }, []);

  const toast = useCallback(({ title, description, duration = 4000, onUndo }) => {
    const id = ++idCounter;

    undoCallbacksRef.current[id] = onUndo ?? null;
    setToasts((prev) => [...prev, { id, title, description, duration, hasUndo: !!onUndo }]);
    return id;
  }, []);

  const handleUndo = useCallback(
    (id) => {
      undoCallbacksRef.current[id]?.();
      dismiss(id);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      <Toast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            className={styles.root}
            duration={t.duration}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          >
            {t.title && <Toast.Title className={styles.title}>{t.title}</Toast.Title>}
            {t.description && (
              <Toast.Description className={styles.description}>{t.description}</Toast.Description>
            )}
            {t.hasUndo && (
              <Toast.Action asChild altText="Undo">
                <button className={styles.undoBtn} onClick={() => handleUndo(t.id)}>
                  Undo
                </button>
              </Toast.Action>
            )}
            <Toast.Close className={styles.closeBtn} aria-label="Dismiss">
              ✕
            </Toast.Close>
          </Toast.Root>
        ))}

        <Toast.Viewport className={styles.viewport} />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
