import clsx from 'clsx';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink-700 text-ink-200',
  success: 'bg-volt/15 text-volt',
  warning: 'bg-signal-amber/15 text-signal-amber',
  danger: 'bg-signal-red/15 text-signal-red',
  info: 'bg-signal-blue/15 text-signal-blue',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium eyebrow', TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}
