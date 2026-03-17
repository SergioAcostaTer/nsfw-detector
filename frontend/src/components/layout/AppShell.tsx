import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Header />
      <main className="min-h-screen pl-[240px] pt-12">
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
