import { useState } from "react";
import { Archive, ImageIcon, LayoutDashboard, ScanLine, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/scan", icon: ScanLine, label: "Scan" },
  { to: "/review", icon: ImageIcon, label: "Review" },
  { to: "/quarantine", icon: Archive, label: "Quarantine" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed inset-y-0 left-0 z-20 flex flex-col transition-all duration-200"
      style={{
        width: expanded ? "176px" : "48px",
        background: "var(--bg-1)",
        borderRight: "1px solid var(--line)",
        overflow: "hidden",
      }}
    >
      <div className="flex h-12 shrink-0 items-center justify-center" style={{ borderBottom: "1px solid var(--line)" }}>
        <Shield size={16} style={{ color: "var(--blue)", flexShrink: 0 }} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-1.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 whitespace-nowrap rounded px-2.5 py-2 transition-colors ${
                isActive ? "" : "hover:bg-white/5"
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "var(--blue-dim)" : undefined,
              color: isActive ? "var(--blue)" : "var(--ink-2)",
            })}
          >
            <Icon size={15} style={{ flexShrink: 0 }} />
            <span className="text-xs font-medium transition-opacity duration-150" style={{ opacity: expanded ? 1 : 0 }}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div
        className="overflow-hidden whitespace-nowrap px-2.5 py-3 text-xs transition-opacity"
        style={{ color: "var(--ink-3)", opacity: expanded ? 1 : 0 }}
      >
        v2.0 · local
      </div>
    </aside>
  );
}
