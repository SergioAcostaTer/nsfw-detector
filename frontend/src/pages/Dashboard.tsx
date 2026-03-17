import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";

import { exportCsvUrl, getFolders, getStats } from "@/api/client";
import { TopBar } from "@/components/layout/TopBar";
import { StatPill } from "@/components/ui/StatPill";

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => getStats().then((response) => response.data) });
  const { data: folders } = useQuery({ queryKey: ["folders"], queryFn: () => getFolders().then((response) => response.data) });

  const decisions = stats?.decisions ?? {};
  const statCards = [
    { label: "Explicit", value: decisions.explicit ?? 0, color: "var(--red)" },
    { label: "Borderline", value: decisions.borderline ?? 0, color: "var(--amber)" },
    { label: "Quarantined", value: stats?.quarantined ?? 0, color: "var(--violet)" },
    { label: "Safe", value: decisions.safe ?? 0, color: "var(--green)" },
  ];

  return (
    <div className="space-y-8 p-8">
      <TopBar
        title="Overview"
        subtitle="Summary of all scanned content"
        actions={
          <a href={exportCsvUrl} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: "var(--bg-2)", color: "var(--ink-1)" }}>
            Export CSV
          </a>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, color }) => (
          <StatPill key={label} label={label} value={value} color={color} />
        ))}
      </div>

      {(decisions.explicit ?? 0) > 0 ? (
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: "var(--red-dim)", border: "1px solid rgba(240, 62, 62, 0.2)" }}
        >
          <span className="text-sm" style={{ color: "var(--ink-1)" }}>
            {decisions.explicit} explicit images need your review
          </span>
          <Link to="/review" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--red)" }}>
            Go to Review <ArrowRight size={12} />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg p-5" style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
            <FolderOpen size={15} />
            Scanned Folders
          </h2>
          {(folders ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              No folders scanned yet. Start a scan to see results.
            </p>
          ) : (
            <div className="space-y-2">
              {(folders ?? []).map((folder) => (
                <div key={folder.folder} className="flex items-center justify-between rounded px-3 py-2" style={{ background: "var(--bg-2)" }}>
                  <span className="truncate text-xs" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>
                    {folder.folder}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-1)" }}>
                    {folder.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}>
          <h2 className="mb-4 text-sm font-medium">Recent Sessions</h2>
          {(stats?.recent_sessions ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              No scan sessions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.recent_sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded px-3 py-2" style={{ background: "var(--bg-2)" }}>
                  <span className="truncate text-xs" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>
                    {session.folder}
                  </span>
                  <span className="text-xs">{session.flagged}/{session.total} flagged</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
