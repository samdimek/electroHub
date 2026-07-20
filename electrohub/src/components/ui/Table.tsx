import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx('eyebrow border-b border-ink-700 px-4 py-3 font-medium text-ink-400', className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('border-b border-ink-800 px-4 py-3 text-ink-100', className)} {...props} />;
}
