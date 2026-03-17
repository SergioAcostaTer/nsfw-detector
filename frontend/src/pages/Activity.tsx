import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment } from "react";
import { useState } from "react";

import { getSessionResults, getSessions } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  done: { bg: "var(--green-dim)", color: "var(--green)" },
  running: { bg: "var(--blue-dim)", color: "var(--blue)" },
  failed: { bg: "var(--red-dim)", color: "var(--red)" },
  cancelled: { bg: "var(--amber-dim)", color: "var(--amber)" },
};

function formatTimeAgo(timestamp: number) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) {
    return `${diff}s ago`;
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Activity() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: () => getSessions().then((response) => response.data) });
  const { data: sessionResults } = useQuery({
    queryKey: ["sessionResults", expanded],
    queryFn: () => getSessionResults(expanded as number).then((response) => response.data),
    enabled: expanded !== null,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" subtitle="Scan session history, durations, and flagged files for each run." />

      {(sessions ?? []).length === 0 ? (
        <EmptyState title="No session history" description="Run a scan to start building an activity timeline." />
      ) : (
        <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <table className="min-w-full text-sm">
            <thead style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
              <tr>
                <th className="px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Folder</th>
                <th className="px-4 py-3 text-left">Files</th>
                <th className="px-4 py-3 text-left">Flagged</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {sessions?.map((session) => {
                const duration = session.ended_at ? `${Math.max(1, session.ended_at - session.started_at)}s` : "In progress";
                const statusStyle = STATUS_STYLES[session.status] ?? { bg: "var(--bg-2)", color: "var(--ink-1)" };
                return (
                  <Fragment key={session.id}>
                    <tr className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded((current) => (current === session.id ? null : session.id))}>
                          {expanded === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-1 text-xs uppercase" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{session.folder}</td>
                      <td className="px-4 py-3">{session.total}</td>
                      <td className="px-4 py-3">{session.flagged}</td>
                      <td className="px-4 py-3">{duration}</td>
                      <td className="px-4 py-3">{formatTimeAgo(session.started_at)}</td>
                    </tr>
                    {expanded === session.id ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4" style={{ background: "var(--bg-0)" }}>
                          {(sessionResults ?? []).length === 0 ? (
                            <p style={{ color: "var(--ink-2)" }}>No flagged files in this session.</p>
                          ) : (
                            <div className="space-y-2">
                              {sessionResults?.map((item) => (
                                <div key={item.id} className="rounded-2xl px-4 py-3" style={{ background: "var(--bg-1)" }}>
                                  <p className="text-sm font-medium">{item.path.split(/[\\/]/).pop()}</p>
                                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                                    {item.folder} · {item.decision} · {(item.score * 100).toFixed(0)}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
