import type { ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.72)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--ink-1)" }}>
          {title}
        </h2>
        <div className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
          {description}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--bg-2)", color: "var(--ink-1)" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--red-dim)", color: "var(--red)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
