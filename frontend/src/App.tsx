import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/ui";
import { Activity } from "@/pages/Activity";
import { Dashboard } from "@/pages/Dashboard";
import { Quarantine } from "@/pages/Quarantine";
import { Review } from "@/pages/Review";
import { Scan } from "@/pages/Scan";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient();

function applyTheme(theme: "dark" | "light" | "system") {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolvedTheme = theme === "system" ? (prefersLight ? "light" : "dark") : theme;
  document.documentElement.classList.toggle("light", resolvedTheme === "light");
}

function AppRoutes() {
  useEffect(() => {
    const theme = (window.localStorage.getItem("theme") as "dark" | "light" | "system" | null) ?? "dark";
    applyTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      if ((window.localStorage.getItem("theme") as "dark" | "light" | "system" | null) === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <BrowserRouter>
      <AppShell>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/review" element={<Review />} />
            <Route path="/quarantine" element={<Quarantine />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
      <ToastContainer />
    </BrowserRouter>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  public constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border px-8 py-16 text-center" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            Reload the app to recover from the last render error.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

export { applyTheme };
