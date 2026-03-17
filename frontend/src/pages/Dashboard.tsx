import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { exportCsvUrl, getFolders, getStats } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, StatPill } from "@/components/ui";
import { formatTimeAgo } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => getStats().then((response) => response.data),
    refetchInterval: 5000,
  });
  const { data: folders } = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((response) => response.data),
    refetchInterval: 5000,
  });

  const decisions = stats?.decisions ?? {};
  const statCards = [
    { label: "Explicit", value: decisions.explicit ?? 0, color: "var(--red)", to: "/review?decision=explicit" },
    { label: "Borderline", value: decisions.borderline ?? 0, color: "var(--amber)", to: "/review?decision=borderline" },
    { label: "Quarantined", value: stats?.quarantined ?? 0, color: "var(--violet)", to: "/quarantine" },
    { label: "Safe", value: decisions.safe ?? 0, color: "var(--green)" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="Summary of scanned content, flagged items, and recent activity."
        actions={
          <a href={exportCsvUrl({ status: "active" })} className="rounded-2xl px-4 py-2 text-sm" style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}>
            Export CSV
          </a>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, color, to }) => (
          <StatPill key={label} label={label} value={value} color={color} to={to} />
        ))}
      </div>

      {(decisions.explicit ?? 0) > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4"
          style={{ background: "var(--amber-dim)", border: "1px solid rgba(245, 158, 11, 0.25)" }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} style={{ color: "var(--amber)" }} />
            <span className="text-sm font-medium">{decisions.explicit} explicit images need review</span>
          </div>
          <Link to="/review?decision=explicit" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--amber)" }}>
            Review now <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border p-5" style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}>
          <h2 className="text-lg font-semibold">Scanned folders</h2>
          {(folders ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No scanned folders" description="Run a scan to populate folder history." />
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
              <table className="min-w-full text-sm">
                <thead style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
                  <tr>
                    <th className="px-4 py-3 text-left">Folder</th>
                    <th className="px-4 py-3 text-left">Files</th>
                    <th className="px-4 py-3 text-left">Flagged</th>
                    <th className="px-4 py-3 text-left">Last scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {folders?.map((folder) => (
                    <tr key={folder.folder} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                      <td className="px-4 py-3">{folder.folder}</td>
                      <td className="px-4 py-3">{folder.count}</td>
                      <td className="px-4 py-3">{folder.flagged}</td>
                      <td className="px-4 py-3">{formatTimeAgo(folder.last_scanned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border p-5" style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}>
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          {(stats?.recent_sessions ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No sessions yet" description="Recent scan runs will appear here." />
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
              <table className="min-w-full text-sm">
                <thead style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
                  <tr>
                    <th className="px-4 py-3 text-left">Folder</th>
                    <th className="px-4 py-3 text-left">Files</th>
                    <th className="px-4 py-3 text-left">Flagged</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_sessions.map((session) => (
                    <tr key={session.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                      <td className="px-4 py-3">{session.folder}</td>
                      <td className="px-4 py-3">{session.total}</td>
                      <td className="px-4 py-3">{session.flagged}</td>
                      <td className="px-4 py-3 capitalize">{session.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
