import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";

import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { ToastContainer } from "@/components/ui";
import { applyTheme, getStoredTheme } from "@/shared/lib/theme";

function AppBootstrap() {
  useEffect(() => {
    applyTheme(getStoredTheme());
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <ToastContainer />
    </>
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
    if (!this.state.hasError) {
      return this.props.children;
    }
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
}

export default function App() {
  return (
    <AppProviders>
      <AppBootstrap />
    </AppProviders>
  );
}
