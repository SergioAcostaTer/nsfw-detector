import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSettings, updateSettings } from "@/api/client";
import { TopBar } from "@/components/layout/TopBar";

export function Settings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings().then((response) => response.data),
  });
  const [theme, setThemeState] = useState<"dark" | "light">(
    typeof window !== "undefined" && window.localStorage.getItem("theme") === "light" ? "light" : "dark",
  );

  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const setTheme = (nextTheme: "dark" | "light") => {
    document.documentElement.classList.toggle("light", nextTheme === "light");
    window.localStorage.setItem("theme", nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <div className="max-w-3xl p-8">
      <TopBar title="Settings" subtitle="Reserved for GPU provider selection, themes, and scan preferences." />

      <div
        className="mt-8 space-y-6 rounded-xl p-6 text-sm"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">GPU Inference</p>
            <p style={{ color: "var(--text-muted)" }}>Prefer CUDA when available, otherwise fall back to CPU.</p>
          </div>
          <button
            onClick={() => save.mutate({ gpu_enabled: !(data?.gpu_enabled ?? true) })}
            className="rounded-lg px-4 py-2"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {data?.gpu_enabled ?? true ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p style={{ color: "var(--text-muted)" }}>Toggle between dark and light mode locally.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className="rounded-lg px-4 py-2"
              style={theme === "dark" ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-elevated)" }}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className="rounded-lg px-4 py-2"
              style={theme === "light" ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-elevated)" }}
            >
              Light
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
