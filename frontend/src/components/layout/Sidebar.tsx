import { useQuery } from "@tanstack/react-query";
import { Activity, Archive, ChevronLeft, ChevronRight, Keyboard, LayoutDashboard, Lock, ScanLine, Settings, Shield, TriangleAlert } from "lucide-react";
import { NavLink } from "react-router-dom";

import { appStore } from "@/app/store";
import { getResultsCount, getScanStatus, getStats } from "@/api/client";
import { ProgressBar } from "@/components/ui";
import { filenameFromPath, formatEtaSeconds } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";

const sections = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard", shortcut: "⌘1" }, { to: "/activity", icon: Activity, label: "Activity", shortcut: "⌘2" }],
  },
  {
    label: "Work",
    items: [
      { to: "/scan", icon: ScanLine, label: "Scan", shortcut: "⌘3" },
      { to: "/review", icon: TriangleAlert, label: "Review", shortcut: "⌘4" },
      { to: "/trash", icon: Archive, label: "Trash", shortcut: "⌘5" },
      { to: "/vault", icon: Lock, label: "Vault", shortcut: "⌘6" },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", icon: Settings, label: "Settings", shortcut: "⌘7" }],
  },
] as const;

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { data: counts } = useQuery({
    queryKey: queryKeys.resultsCount,
    queryFn: () => getResultsCount().then((response) => response.data),
  });
  const { data: stats } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => getStats().then((response) => response.data),
  });
  const { data: scanStatus } = useQuery({
    queryKey: queryKeys.scanStatus(),
    queryFn: () => getScanStatus().then((response) => response.data),
  });

  const reviewCount = (counts?.explicit ?? 0) + (counts?.borderline ?? 0);
  const processed = scanStatus?.total ? Math.min(scanStatus.total, Math.round((scanStatus.progress / 100) * scanStatus.total)) : 0;
  const liveActivity = scanStatus?.current_file
    ? scanStatus.current_file.includes("Discovering")
      ? scanStatus.current_file
      : filenameFromPath(scanStatus.current_file)
    : "";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r px-3 py-4 transition-[width] duration-200"
      style={{ width: collapsed ? "84px" : "240px", background: "var(--bg-1)", borderColor: "var(--line)" }}
    >
      <div className={`mb-6 flex items-center gap-2 ${collapsed ? "justify-center" : "justify-between"}`}>
        <div className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl border"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.24), rgba(99,102,241,0.18))", borderColor: "var(--line)" }}
        >
          <Shield size={18} style={{ color: "var(--blue)" }} />
        </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold">NSFW Scanner</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                Desktop moderation
              </p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => appStore.setSidebarCollapsed(!collapsed)}
            className="rounded-lg p-2 text-[var(--ink-2)] transition hover:bg-[var(--bg-2)]"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        ) : null}
      </div>

      <nav className="space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--ink-3)" }}>
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map(({ to, icon: Icon, label, shortcut }) => {
                const badge = to === "/review" ? reviewCount : to === "/trash" ? stats?.quarantined ?? 0 : to === "/vault" ? stats?.vaulted ?? 0 : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      `group relative flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} rounded-2xl py-2.5 text-sm transition-colors ${isActive ? "" : "hover:bg-white/5"}`
                    }
                    style={({ isActive }) => ({
                      background: isActive ? "var(--bg-2)" : "transparent",
                      color: isActive ? "var(--ink-1)" : "var(--ink-2)",
                      boxShadow: isActive && !collapsed ? "inset 3px 0 0 var(--accent-primary)" : undefined,
                      border: collapsed && isActive ? "1px solid var(--accent-primary)" : "1px solid transparent",
                    })}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={16} />
                    {!collapsed ? <span className="flex-1">{label}</span> : null}
                    {badge && !collapsed ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background: to === "/review" ? "var(--red-dim)" : to === "/trash" ? "var(--violet-dim)" : "var(--blue-dim)",
                          color: to === "/review" ? "var(--red)" : to === "/trash" ? "var(--violet)" : "var(--blue)",
                        }}
                      >
                        {badge}
                      </span>
                    ) : null}
                    {!collapsed ? (
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--ink-3)" }}>
                        {shortcut}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {scanStatus?.running ? (
        <div className="mt-auto space-y-3 rounded-2xl border px-4 py-4 text-xs" style={{ borderColor: "var(--line)", background: "var(--bg-2)", color: "var(--ink-2)" }}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed ? <p className="font-medium text-[var(--ink-1)]">Scanning...</p> : null}
            <span>{scanStatus.progress}%</span>
          </div>
          <ProgressBar value={scanStatus.progress} />
          {!collapsed ? (
            <div className="space-y-1.5">
              <p>
                {scanStatus.flagged} flagged · {processed}/{scanStatus.total}
              </p>
              <p>ETA {formatEtaSeconds(scanStatus.eta_seconds)}</p>
              {liveActivity ? (
                <p className="truncate" style={{ color: "var(--ink-3)" }}>
                  {liveActivity}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-auto rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: "var(--line)", background: "var(--bg-2)", color: "var(--ink-2)" }}>
          <p className="font-medium text-[var(--ink-1)]">{collapsed ? "OK" : "Ready"}</p>
          {!collapsed ? <p className="mt-1">Review, trash, and vault flows are local-first and reversible.</p> : null}
        </div>
      )}

      {collapsed ? (
        <button
          type="button"
          onClick={() => appStore.setSidebarCollapsed(false)}
          className="mt-3 flex h-10 items-center justify-center rounded-2xl border text-[var(--ink-2)] transition hover:bg-[var(--bg-2)]"
          style={{ borderColor: "var(--line)" }}
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: "var(--line)", background: "var(--bg-2)", color: "var(--ink-2)" }}>
          <div className="mb-2 flex items-center gap-2 text-[var(--ink-1)]">
            <Keyboard size={14} />
            <span className="font-medium">Review keys</span>
          </div>
          <p><span className="font-medium text-[var(--ink-1)]">Arrows</span> move</p>
          <p><span className="font-medium text-[var(--ink-1)]">S</span> safe · <span className="font-medium text-[var(--ink-1)]">Q</span> trash · <span className="font-medium text-[var(--ink-1)]">V</span> vault</p>
          <p><span className="font-medium text-[var(--ink-1)]">G</span> grid · <span className="font-medium text-[var(--ink-1)]">L</span> list · <span className="font-medium text-[var(--ink-1)]">Ctrl/Cmd+Z</span> undo</p>
        </div>
      )}
    </aside>
  );
}
