import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getSettings, updateSettings } from "@/api/client";
import { TopBar } from "@/components/layout/TopBar";

export function Settings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings().then((response) => response.data),
  });
  const [explicit, setExplicit] = useState(0.6);
  const [borderline, setBorderline] = useState(0.4);
  const [theme, setThemeState] = useState<"dark" | "light">(
    typeof window !== "undefined" && window.localStorage.getItem("theme") === "light" ? "light" : "dark",
  );

  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const currentSettings = data ?? {
    gpu_enabled: true,
    explicit_threshold: explicit,
    borderline_threshold: borderline,
  };

  const setTheme = (nextTheme: "dark" | "light") => {
    document.documentElement.classList.toggle("light", nextTheme === "light");
    window.localStorage.setItem("theme", nextTheme);
    setThemeState(nextTheme);
  };

  useEffect(() => {
    if (data) {
      setExplicit(data.explicit_threshold);
      setBorderline(data.borderline_threshold);
    }
  }, [data]);

  return (
    <div className="max-w-3xl p-8">
      <TopBar title="Settings" subtitle="GPU mode, thresholds, and local theme preferences." />

      <div
        className="mt-8 space-y-6 rounded-xl p-6 text-sm"
        style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">GPU Inference</p>
            <p style={{ color: "var(--ink-2)" }}>Prefer CUDA when available, otherwise fall back to CPU.</p>
          </div>
          <button
            onClick={() =>
              save.mutate({
                ...currentSettings,
                gpu_enabled: !currentSettings.gpu_enabled,
                explicit_threshold: explicit,
                borderline_threshold: borderline,
              })
            }
            className="rounded-lg px-4 py-2"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {currentSettings.gpu_enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p style={{ color: "var(--ink-2)" }}>Toggle between dark and light mode locally.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className="rounded-lg px-4 py-2"
              style={theme === "dark" ? { background: "var(--blue)", color: "#fff" } : { background: "var(--bg-2)" }}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className="rounded-lg px-4 py-2"
              style={theme === "light" ? { background: "var(--blue)", color: "#fff" } : { background: "var(--bg-2)" }}
            >
              Light
            </button>
          </div>
        </div>

        <div>
          <label className="flex justify-between text-xs font-medium">
            <span>Explicit Threshold</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{explicit.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={explicit}
            onChange={(event) => setExplicit(Number(event.target.value))}
            className="mt-1.5 w-full"
          />
        </div>

        <div>
          <label className="flex justify-between text-xs font-medium">
            <span>Borderline Threshold</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{borderline.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={borderline}
            onChange={(event) => setBorderline(Number(event.target.value))}
            className="mt-1.5 w-full"
          />
        </div>

        <button
          onClick={() =>
            save.mutate({
              ...currentSettings,
              explicit_threshold: explicit,
              borderline_threshold: borderline,
            })
          }
          className="rounded px-4 py-2 text-xs font-medium"
          style={{ background: "var(--bg-2)", color: "var(--ink-1)" }}
        >
          Save Thresholds
        </button>
      </div>
    </div>
  );
}
