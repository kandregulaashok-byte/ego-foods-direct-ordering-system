export default function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg px-4 py-8 text-center text-base font-medium leading-6 text-text-muted">
      {children}
    </div>
  );
}
