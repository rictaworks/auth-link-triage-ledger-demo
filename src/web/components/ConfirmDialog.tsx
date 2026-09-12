"use client";

import type { ReactNode } from "react";
import { STRINGS } from "@/config/strings";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * requirements.md: ネイティブ confirm() は使用禁止。削除・主経路降格などの確認はこのダイアログで行う。
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <div>{body}</div>
        <div className="modal-actions">
          <button type="button" className="button" onClick={onCancel}>
            {cancelLabel ?? STRINGS.common.cancel}
          </button>
          <button type="button" className={`button ${danger ? "button-danger" : "button-primary"}`} onClick={onConfirm}>
            {confirmLabel ?? STRINGS.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
