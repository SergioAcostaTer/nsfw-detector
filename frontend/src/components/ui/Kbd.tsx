export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--surface-overlay)] px-1.5 text-[10px] font-semibold text-[var(--text-secondary)]">
      {children}
    </kbd>
  );
}
