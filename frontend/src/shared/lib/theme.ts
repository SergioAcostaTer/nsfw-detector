import type { ThemeMode } from "@/shared/types/api";

export function applyTheme(theme: ThemeMode) {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolvedTheme = theme === "system" ? (prefersLight ? "light" : "dark") : theme;
  document.documentElement.classList.toggle("light", resolvedTheme === "light");
}

export function getStoredTheme(): ThemeMode {
  return (window.localStorage.getItem("theme") as ThemeMode | null) ?? "dark";
}

export function storeTheme(theme: ThemeMode) {
  window.localStorage.setItem("theme", theme);
}
