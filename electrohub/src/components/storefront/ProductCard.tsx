import Link from 'next/link';
import Image from 'next/image';
import { formatCents } from '@/components/ui/formatters';

interface ProductCardProps {
  slug: string;
  title: string;
  priceCents: number;
  compareAtCents?: number | null;
  imageUrl?: string;
  vendorName: string;
}

export function ProductCard({ slug, title, priceCents, compareAtCents, imageUrl, vendorName }: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col overflow-hidden rounded border border-ink-700 bg-ink-900 transition-colors hover:border-volt"
    >
      <div className="relative aspect-square bg-ink-800">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-600 eyebrow">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="eyebrow">{vendorName}</p>
        <h3 className="line-clamp-2 text-sm font-medium text-ink-100 group-hover:text-volt">{title}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="readout text-base font-semibold text-ink-100">{formatCents(priceCents)}</span>
          {compareAtCents && compareAtCents > priceCents && (
            <span className="readout text-xs text-ink-400 line-through">{formatCents(compareAtCents)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
