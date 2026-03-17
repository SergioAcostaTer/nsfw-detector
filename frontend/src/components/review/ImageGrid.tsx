import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

import { imageUrl, type ScanResult } from "@/api/client";
import { ImageCard } from "@/components/review/ImageCard";

export function ImageGrid({
  items,
  selected,
  onToggle,
  onQuarantine,
  onDelete,
}: {
  items: ScanResult[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onQuarantine: (ids: number[]) => void;
  onDelete: (ids: number[]) => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const activeItem = lightboxIndex === null ? null : items[lightboxIndex];
  const currentIndex = lightboxIndex ?? 0;

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      }
      if (event.key === "ArrowLeft") {
        setImgLoaded(false);
        setLightboxIndex((current) => (current === null ? current : (current - 1 + items.length) % items.length));
      }
      if (event.key === "ArrowRight") {
        setImgLoaded(false);
        setLightboxIndex((current) => (current === null ? current : (current + 1) % items.length));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, lightboxIndex]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <ImageCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggle={() => onToggle(item.id)}
            onOpen={() => {
              setImgLoaded(false);
              setLightboxIndex(index);
            }}
            onQuarantine={() => onQuarantine([item.id])}
            onDelete={() => onDelete([item.id])}
          />
        ))}
      </div>

      {activeItem ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="grid max-h-[90vh] w-full max-w-6xl gap-4 overflow-hidden rounded-3xl border p-4 lg:grid-cols-[minmax(0,1fr),320px]"
            style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex min-h-[60vh] items-center justify-center rounded-2xl" style={{ background: "var(--bg-0)" }}>
              {!imgLoaded ? <Loader2 className="animate-spin" style={{ color: "var(--ink-2)" }} /> : null}
              <img
                src={imageUrl(activeItem.path)}
                alt=""
                onLoad={() => setImgLoaded(true)}
                className="max-h-[80vh] w-full object-contain"
                style={{ display: imgLoaded ? "block" : "none" }}
              />
              <button
                  onClick={() => {
                    setImgLoaded(false);
                    setLightboxIndex((currentIndex - 1 + items.length) % items.length);
                  }}
                className="absolute left-4 top-1/2 rounded-full p-2"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                  onClick={() => {
                    setImgLoaded(false);
                    setLightboxIndex((currentIndex + 1) % items.length);
                  }}
                className="absolute right-4 top-1/2 rounded-full p-2"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Image details</h2>
                <button onClick={() => setLightboxIndex(null)} className="rounded-xl p-2" style={{ background: "var(--bg-2)" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
                <p className="break-all" style={{ fontFamily: "var(--font-mono)" }}>
                  {activeItem.path}
                </p>
                <p>
                  Decision: <span style={{ color: activeItem.decision === "explicit" ? "var(--red)" : "var(--amber)" }}>{activeItem.decision}</span>
                </p>
                <p>Score: {(activeItem.score * 100).toFixed(1)}%</p>
                <p>Classes: {activeItem.classes}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
