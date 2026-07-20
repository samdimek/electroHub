import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-volt text-ink-950 hover:bg-volt-dim disabled:bg-ink-600 disabled:text-ink-400',
  secondary: 'bg-ink-800 text-ink-100 border border-ink-600 hover:border-ink-400 disabled:opacity-50',
  ghost: 'bg-transparent text-ink-200 hover:bg-ink-800 disabled:opacity-50',
  danger: 'bg-signal-red/10 text-signal-red border border-signal-red/40 hover:bg-signal-red/20 disabled:opacity-50',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
