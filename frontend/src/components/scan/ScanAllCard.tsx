import { ChevronDown, ChevronUp, Cpu, HardDrive, Shield } from "lucide-react";
import { useState } from "react";

export function ScanAllCard({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl border p-6" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Scan Entire PC</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            Discover images across mounted drives, skip system folders, and process them with the same detection pipeline.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[
              { icon: HardDrive, label: "Drive discovery" },
              { icon: Shield, label: "System skip lists" },
              { icon: Cpu, label: "Cancelable" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full px-3 py-1" style={{ background: "var(--bg-2)" }}>
                <Icon size={12} /> {label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={disabled}
          className="rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          Start full scan
        </button>
      </div>

      <button
        onClick={() => setOpen((current) => !current)}
        className="mt-4 flex items-center gap-2 text-sm"
        style={{ color: "var(--ink-2)" }}
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        What gets skipped?
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
          Operating system folders, application caches, trash folders, symlinks, and any custom exclusions saved in Settings.
        </div>
      ) : null}
    </div>
  );
}
