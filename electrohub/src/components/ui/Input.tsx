import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, id, ...props }, ref) => {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="eyebrow">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'rounded border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400',
          'focus:border-volt focus:outline-none',
          error && 'border-signal-red',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-signal-red">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';
