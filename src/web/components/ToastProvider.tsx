"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * requirements.md: ネイティブ alert() は使用禁止。成功・失敗の通知はこのトースト表示で代替する。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastItem["kind"], message: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => remove(id), 6000);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message: string) => push("success", message),
      showError: (message: string) => push("error", message)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
            <FontAwesomeIcon icon={toast.kind === "success" ? faCircleCheck : faCircleExclamation} />
            <span>{toast.message}</span>
            <button type="button" onClick={() => remove(toast.id)} aria-label={STRINGS.common.close}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
