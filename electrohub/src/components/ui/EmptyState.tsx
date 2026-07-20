export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-ink-700 px-6 py-16 text-center">
      <p className="font-display text-lg text-ink-100">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-400">{description}</p>}
    </div>
  );
}
