import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle, FolderOpen, ShieldAlert } from "lucide-react";

import { exportCsvUrl, getFolders, getStats } from "@/api/client";
import { TopBar } from "@/components/layout/TopBar";

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => getStats().then((response) => response.data) });
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: () => getFolders().then((response) => response.data),
  });

  const decisions = stats?.decisions ?? {};
  const statCards = [
    { label: "Explicit", value: decisions.explicit ?? 0, color: "var(--explicit)", icon: ShieldAlert },
    { label: "Borderline", value: decisions.borderline ?? 0, color: "var(--borderline)", icon: ShieldAlert },
    { label: "Safe", value: decisions.safe ?? 0, color: "var(--safe)", icon: CheckCircle },
    { label: "Quarantined", value: stats?.quarantined ?? 0, color: "var(--quarantine)", icon: Archive },
  ];

  return (
    <div className="space-y-8 p-8">
      <TopBar title="Overview" subtitle="Summary of all scanned content" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="flex items-start gap-4 rounded-xl p-5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="rounded-lg p-2" style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{value}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
          <FolderOpen size={15} />
          Scanned Folders
        </h2>
        {(folders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No folders scanned yet. Start a scan to see results.
          </p>
        ) : (
          <div className="space-y-2">
            {(folders ?? []).map((folder) => (
              <div
                key={folder.folder}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--bg-elevated)" }}
              >
                <span className="truncate font-mono text-sm" style={{ color: "var(--text-muted)" }}>
                  {folder.folder}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "rgba(79, 110, 247, 0.12)", color: "var(--accent)" }}
                >
                  {folder.count} files
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <h2 className="mb-4 text-sm font-medium">Recent Sessions</h2>
          {(stats?.recent_sessions ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No scan sessions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {(stats?.recent_sessions as Array<{ id: number; folder: string; total: number; flagged: number; status: string }>).map(
                (session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <span className="truncate font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {session.folder}
                    </span>
                    <span className="text-xs">
                      {session.flagged}/{session.total} flagged
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <h2 className="mb-2 text-sm font-medium">Export Report</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
            Download the latest scan state as CSV.
          </p>
          <a
            href={exportCsvUrl}
            className="inline-flex rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}
