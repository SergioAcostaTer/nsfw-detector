import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Quarantine } from "@/pages/Quarantine";
import { Review } from "@/pages/Review";
import { Scan } from "@/pages/Scan";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient();

function AppShell() {
  useEffect(() => {
    const theme = window.localStorage.getItem("theme") ?? "dark";
    document.documentElement.classList.toggle("light", theme === "light");
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 min-h-screen flex-1" style={{ background: "transparent" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/review" element={<Review />} />
            <Route path="/quarantine" element={<Quarantine />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
