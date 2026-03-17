import { useEffect, useState } from "react";

type ToastItem = {
  id: number;
  title: string;
  variant?: "default" | "error";
};

type ToastInput = Omit<ToastItem, "id">;

const listeners = new Set<(item: ToastItem) => void>();

export function toast(input: ToastInput) {
  const item = { id: Date.now() + Math.random(), ...input };
  listeners.forEach((listener) => listener(item));
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setItems((current) => [...current, item]);
      window.setTimeout(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }, 3200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto rounded-2xl px-4 py-3 shadow-xl transition-transform"
          style={{
            background: "var(--bg-1)",
            border: `1px solid ${item.variant === "error" ? "rgba(220, 38, 38, 0.35)" : "var(--line)"}`,
            color: item.variant === "error" ? "var(--red)" : "var(--ink-1)",
            animation: "toast-slide 0.2s ease-out",
          }}
        >
          <p className="text-sm font-medium">{item.title}</p>
        </div>
      ))}
    </div>
  );
}
