import type { ReactNode } from "react";

import { useAppStore } from "@/app/store";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} />
      <Header collapsed={sidebarCollapsed} />
      <main
        className="min-h-screen pt-12 transition-[padding-left] duration-200"
        style={{ paddingLeft: sidebarCollapsed ? "76px" : "240px" }}
      >
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
