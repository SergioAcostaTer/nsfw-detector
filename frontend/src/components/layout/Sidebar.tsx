import { useQuery } from "@tanstack/react-query";
import { Activity, Archive, ImageIcon, LayoutDashboard, ScanLine, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";

import { getResultsCount, getStats } from "@/api/client";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/scan", icon: ScanLine, label: "Scan" },
  { to: "/review", icon: ImageIcon, label: "Review" },
  { to: "/quarantine", icon: Archive, label: "Quarantine" },
  { to: "/activity", icon: Activity, label: "Activity" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { data: counts } = useQuery({
    queryKey: ["resultsCount"],
    queryFn: () => getResultsCount().then((response) => response.data),
  });
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => getStats().then((response) => response.data),
  });

  const reviewCount = (counts?.explicit ?? 0) + (counts?.borderline ?? 0);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r px-4 py-5"
      style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
    >
      <div className="mb-8 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.24), rgba(34,197,94,0.18))" }}
        >
          <Shield size={18} style={{ color: "var(--blue)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold">NSFW Scanner</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            Desktop control panel
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map(({ to, icon: Icon, label }) => {
          const badge = to === "/review" ? reviewCount : to === "/quarantine" ? stats?.quarantined ?? 0 : null;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${isActive ? "" : "hover:bg-white/5"}`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--bg-2)" : "transparent",
                color: isActive ? "var(--ink-1)" : "var(--ink-2)",
              })}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: "var(--bg-3)", color: "var(--ink-1)" }}
                >
                  {badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div
        className="mt-auto rounded-2xl border px-4 py-3 text-xs"
        style={{ borderColor: "var(--line)", background: "var(--bg-2)", color: "var(--ink-2)" }}
      >
        <p className="font-medium" style={{ color: "var(--ink-1)" }}>
          Local mode
        </p>
        <p className="mt-1">220px fixed navigation, no hidden labels, no remote sync.</p>
      </div>
    </aside>
  );
}
