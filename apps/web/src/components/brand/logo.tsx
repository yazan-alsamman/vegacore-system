import clsx from 'clsx';
import { brand } from '@/lib/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Sidebar / dark background — uses white wordmark */
  onDark?: boolean;
  className?: string;
}

const WIDTH = {
  sm: 140,
  md: 180,
  lg: 220,
} as const;

export function Logo({ size = 'md', onDark = false, className }: LogoProps) {
  const width = WIDTH[size];
  const src = onDark ? brand.logoSidebar : brand.logoLogin;

  return (
    <div className={clsx('inline-flex items-center justify-center', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
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
