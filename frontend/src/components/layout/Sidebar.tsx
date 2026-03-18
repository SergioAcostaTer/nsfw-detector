import { useQuery } from "@tanstack/react-query";
import { Activity, Archive, ChevronLeft, ChevronRight, LayoutDashboard, ScanLine, Settings, Shield, TriangleAlert } from "lucide-react";
import { NavLink } from "react-router-dom";

import { appStore } from "@/app/store";
import { getResultsCount, getScanStatus, getStats } from "@/api/client";
import { ProgressBar } from "@/components/ui";
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
      { to: "/quarantine", icon: Archive, label: "Quarantine", shortcut: "⌘5" },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", icon: Settings, label: "Settings", shortcut: "⌘6" }],
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
    refetchInterval: (query) => (query.state.data?.running ? 1000 : false),
  });

  const reviewCount = (counts?.explicit ?? 0) + (counts?.borderline ?? 0);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r px-3 py-4 transition-[width] duration-200"
      style={{ width: collapsed ? "76px" : "240px", background: "var(--bg-1)", borderColor: "var(--line)" }}
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.24), rgba(99,102,241,0.18))" }}
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
        <button
          type="button"
          onClick={() => appStore.setSidebarCollapsed(!collapsed)}
          className="rounded-lg p-2 text-[var(--ink-2)] transition hover:bg-[var(--bg-2)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
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
                const badge = to === "/review" ? reviewCount : to === "/quarantine" ? stats?.quarantined ?? 0 : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      `group relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-2xl px-3 py-2.5 text-sm transition-colors ${isActive ? "" : "hover:bg-white/5"}`
                    }
                    style={({ isActive }) => ({
                      background: isActive ? "var(--bg-2)" : "transparent",
                      color: isActive ? "var(--ink-1)" : "var(--ink-2)",
                      boxShadow: isActive ? "inset 3px 0 0 var(--accent-primary)" : undefined,
                    })}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={16} />
                    {!collapsed ? <span className="flex-1">{label}</span> : null}
                    {badge && !collapsed ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background: to === "/review" ? "var(--red-dim)" : "var(--violet-dim)",
                          color: to === "/review" ? "var(--red)" : "var(--violet)",
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
            <p>
              {scanStatus.flagged} flagged · {scanStatus.total ? Math.round((scanStatus.progress / 100) * scanStatus.total) : 0}/{scanStatus.total}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-auto rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: "var(--line)", background: "var(--bg-2)", color: "var(--ink-2)" }}>
          <p className="font-medium text-[var(--ink-1)]">{collapsed ? "OK" : "Ready"}</p>
          {!collapsed ? <p className="mt-1">Review and quarantine flows are local-first and reversible.</p> : null}
        </div>
      )}
    </aside>
  );
}
