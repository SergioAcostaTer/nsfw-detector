import { Archive, Image, LayoutDashboard, ScanLine, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/scan", icon: ScanLine, label: "Scan" },
  { to: "/review", icon: Image, label: "Review" },
  { to: "/quarantine", icon: Archive, label: "Quarantine" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-10 w-56 border-r backdrop-blur"
      style={{ background: "rgba(17, 19, 24, 0.92)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 border-b px-5 py-5" style={{ borderColor: "var(--border)" }}>
        <Shield size={20} style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold tracking-tight">NSFW Scanner</span>
      </div>

      <nav className="space-y-1 p-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150 ${
                isActive ? "font-medium text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`
            }
            style={({ isActive }) => (isActive ? { background: "var(--accent)", color: "#fff" } : {})}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="absolute inset-x-0 bottom-0 px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
        v2.0 - Local Only
      </div>
    </aside>
  );
}
