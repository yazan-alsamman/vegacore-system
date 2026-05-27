import clsx from 'clsx';
import { brand } from '@/lib/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** White card behind logo — for dark backgrounds (sidebar) */
  onDark?: boolean;
  className?: string;
}

const WIDTH = {
  sm: 140,
  md: 180,
  lg: 220,
} as const;

/** Full VegaCore wordmark from /brand/logo.jpg (icon + VEGA CORE text). */
export function Logo({ size = 'md', onDark = false, className }: LogoProps) {
  const width = WIDTH[size];

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center',
        onDark && 'rounded-xl bg-white px-3 py-2 shadow-md',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logo}
        alt="VegaCore"
        width={width}
        height={Math.round(width * 0.55)}
        className="block h-auto max-w-full object-contain"
        style={{ width, height: 'auto' }}
        decoding="async"
      />
    </div>
  );
}
