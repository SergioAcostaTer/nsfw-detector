import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getResults, getScanStatus, thumbnailUrl } from "@/api/client";
import { filenameFromPath } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";

export function Header() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { data: status } = useQuery({
    queryKey: queryKeys.scanStatus(),
    queryFn: () => getScanStatus().then((response) => response.data),
    refetchInterval: (query) => (query.state.data?.running ? 1000 : false),
  });
  const { data: searchable } = useQuery({
    queryKey: queryKeys.headerSearch(debouncedQuery),
    queryFn: () => getResults({ status: "active", q: debouncedQuery, limit: 8 }).then((response) => response.data),
    enabled: debouncedQuery.trim().length > 0,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  const results = useMemo(() => {
    return searchable?.items ?? [];
  }, [searchable?.items]);

  return (
    <header
      className="fixed left-[220px] right-0 top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur"
      style={{ background: "rgba(10, 12, 14, 0.82)", borderColor: "var(--line)" }}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--ink-3)" }}>
          Local moderation
        </p>
        <p className="text-sm font-semibold">NSFW Scanner</p>
      </div>

      <div className="relative w-full max-w-xl">
        <div
          className="flex items-center gap-3 rounded-2xl border px-3 py-2"
          style={{ background: "var(--bg-1)", borderColor: focused ? "var(--blue)" : "var(--line)" }}
        >
          <Search size={16} style={{ color: "var(--ink-3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Search flagged files"
            className="w-full bg-transparent text-sm outline-none"
          />
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]"
            style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
          >
            <Command size={12} /> K
          </span>
        </div>

        {focused ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border"
            style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
          >
            {debouncedQuery.trim().length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: "var(--ink-2)" }}>
                Type to search flagged files.
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: "var(--ink-2)" }}>
                No matching flagged files.
              </p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    navigate(`/review?decision=${item.decision}`);
                    setFocused(false);
                  }}
                  className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
                  style={{ borderColor: "var(--line-soft)" }}
                >
                  <img src={thumbnailUrl(item.path, 64)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{filenameFromPath(item.path)}</p>
                    <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                      {item.folder}{item.type === "video" ? ` · video${item.frame_count ? ` · ${item.frame_count}f` : ""}` : ""}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[11px] uppercase"
                    style={{
                      background: item.decision === "explicit" ? "var(--red-dim)" : "var(--amber-dim)",
                      color: item.decision === "explicit" ? "var(--red)" : "var(--amber)",
                    }}
                  >
                    {item.decision}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: status?.running ? "var(--blue)" : "var(--green)" }}
        />
        {status?.running ? "Scan active" : "Idle"}
      </div>
    </header>
  );
}
