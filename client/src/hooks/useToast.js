import { ToastContext } from "@providers/ToastProvider/ToastContext.jsx";
import { useContext } from "react";

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
