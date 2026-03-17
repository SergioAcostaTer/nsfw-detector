import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { applyTheme } from "@/App";
import { deleteExpiredQuarantine, getSettings, updateSettings, type AppSettings, type ThemeMode } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "@/components/ui";

const DEFAULT_SETTINGS: AppSettings = {
  gpu_enabled: true,
  explicit_threshold: 0.6,
  borderline_threshold: 0.4,
  custom_skip_folders: [],
  auto_delete_days: 30,
  theme: "dark",
  batch_size: 8,
  video_fps: 1.0,
};

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border p-6" style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function Settings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings().then((response) => response.data),
  });
  const [localSettings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setLocalSettings(data);
      window.localStorage.setItem("theme", data.theme);
      applyTheme(data.theme);
    }
  }, [data]);

  useEffect(() => {
    applyTheme(localSettings.theme);
  }, [localSettings.theme]);

  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setLastSavedAt(Date.now());
      window.localStorage.setItem("theme", response.data.theme);
      applyTheme(response.data.theme);
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "error" }),
  });

  const cleanup = useMutation({
    mutationFn: () => deleteExpiredQuarantine(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: `${response.data.deleted} expired file${response.data.deleted === 1 ? "" : "s"} removed` });
    },
    onError: () => toast({ title: "Cleanup failed", variant: "error" }),
  });

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings((current) => ({ ...current, [key]: value }));
  };

  const lastSavedLabel = lastSavedAt
    ? `${Math.max(1, Math.round((Date.now() - lastSavedAt) / 60000))} minute${Date.now() - lastSavedAt >= 120000 ? "s" : ""} ago`
    : "Not saved yet";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Inference preferences, quarantine retention, exclusions, and appearance."
        actions={
          <button
            onClick={() => save.mutate(localSettings)}
            className="rounded-2xl px-4 py-2 text-sm font-medium"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            Save Settings
          </button>
        }
      />

      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Last saved: {lastSavedLabel} · ✓
      </p>

      <Section title="Inference" description="Choose the execution provider and hardware preference.">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => updateField("gpu_enabled", !localSettings.gpu_enabled)}
            className="rounded-2xl px-4 py-2 text-sm"
            style={{ background: localSettings.gpu_enabled ? "var(--blue)" : "var(--bg-2)", color: localSettings.gpu_enabled ? "#fff" : "var(--ink-1)" }}
          >
            GPU {localSettings.gpu_enabled ? "Enabled" : "Disabled"}
          </button>
          <label className="text-sm">
            Batch size
            <input
              type="number"
              min={1}
              max={32}
              value={localSettings.batch_size}
              onChange={(event) => updateField("batch_size", Math.max(1, Number(event.target.value) || 1))}
              className="ml-2 w-20 rounded-xl border px-3 py-2"
              style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
            />
          </label>
        </div>
      </Section>

      <Section title="Detection Thresholds" description="Tune how aggressive explicit and borderline decisions should be.">
        <div>
          <label className="flex justify-between text-sm font-medium">
            <span>Explicit threshold</span>
            <span>{localSettings.explicit_threshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={localSettings.explicit_threshold}
            onChange={(event) => updateField("explicit_threshold", Number(event.target.value))}
            className="mt-2 w-full"
          />
        </div>
        <div>
          <label className="flex justify-between text-sm font-medium">
            <span>Borderline threshold</span>
            <span>{localSettings.borderline_threshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={localSettings.borderline_threshold}
            onChange={(event) => updateField("borderline_threshold", Number(event.target.value))}
            className="mt-2 w-full"
          />
        </div>
      </Section>

      <Section title="Quarantine" description="Control how long quarantined files are retained before cleanup.">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={localSettings.auto_delete_days}
            onChange={(event) => updateField("auto_delete_days", Number(event.target.value))}
            className="rounded-2xl border px-4 py-2"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
          >
            {[7, 14, 30, 60, 90].map((days) => (
              <option key={days} value={days}>
                Delete after {days} days
              </option>
            ))}
          </select>
          <button
            onClick={() => cleanup.mutate()}
            className="rounded-2xl px-4 py-2 text-sm"
            style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
          >
            Run cleanup now
          </button>
        </div>
      </Section>

      <Section title="Scan Exclusions" description="One absolute path per line. These folders are skipped during full PC scans.">
        <textarea
          value={localSettings.custom_skip_folders.join("\n")}
          onChange={(event) =>
            updateField(
              "custom_skip_folders",
              event.target.value
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean),
            )
          }
          rows={6}
          className="w-full rounded-2xl border px-4 py-3"
          style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
          placeholder={"C:\\Users\\Sergio\\Pictures\\Safe\nD:\\Backups"}
        />
      </Section>

      <Section title="Video Processing" description="Control frame sampling for supported video scans.">
        <label className="text-sm">
          Frames per second
          <input
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={localSettings.video_fps}
            onChange={(event) => updateField("video_fps", Math.max(0.1, Number(event.target.value) || 1))}
            className="ml-2 w-24 rounded-xl border px-3 py-2"
            style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}
          />
        </label>
      </Section>

      <Section title="Appearance" description="Choose a local theme. System follows your OS preference.">
        <div className="flex flex-wrap gap-2">
          {(["dark", "light", "system"] as ThemeMode[]).map((theme) => (
            <button
              key={theme}
              onClick={() => updateField("theme", theme)}
              className="rounded-2xl px-4 py-2 text-sm capitalize"
              style={{
                background: localSettings.theme === theme ? "var(--blue)" : "var(--bg-2)",
                color: localSettings.theme === theme ? "#fff" : "var(--ink-1)",
              }}
            >
              {theme}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
