import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

export function usePanelResize(initialWidth: number, min: number, max: number, side: "left" | "right", storageKey: string) {
  const dragging = useRef(false);
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") {
      return clamp(initialWidth);
    }
    const saved = window.localStorage.getItem(storageKey);
    return saved ? clamp(Number(saved)) : clamp(initialWidth);
  });

  useEffect(() => {
    setWidth((current) => clamp(current));
  }, [min, max]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(width));
  }, [storageKey, width]);

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) {
        return;
      }
      const delta = side === "left" ? moveEvent.movementX : -moveEvent.movementX;
      setWidth((current) => clamp(current + delta));
    };

    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return { width, onMouseDown };
}
