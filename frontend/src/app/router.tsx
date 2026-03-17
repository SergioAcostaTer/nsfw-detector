import type { ReactNode } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Activity } from "@/pages/Activity";
import { Dashboard } from "@/pages/Dashboard";
import { Quarantine } from "@/pages/Quarantine";
import { Review } from "@/pages/Review";
import { Scan } from "@/pages/Scan";
import { Settings } from "@/pages/Settings";

function NotFound() {
  return (
    <div className="rounded-3xl border px-8 py-16 text-center" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        The route you requested does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-medium"
        style={{ background: "var(--bg-2)", color: "var(--ink-1)" }}
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export function AppRouter({ children }: { children?: ReactNode }) {
  return (
    <BrowserRouter>
      <AppShell>
        {children}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/review" element={<Review />} />
          <Route path="/quarantine" element={<Quarantine />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
