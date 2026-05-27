import Image from 'next/image';
import clsx from 'clsx';
import { brand } from '@/lib/brand';

interface LogoProps {
  variant?: 'default' | 'light' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { width: 128, height: 40 },
  md: { width: 160, height: 48 },
  lg: { width: 200, height: 60 },
};

export function Logo({ variant = 'default', size = 'md', showText = false, className }: LogoProps) {
  const s = SIZES[size];

  const isLight = variant === 'light';

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div
        className={clsx(
          'flex items-center',
          isLight && 'rounded-lg bg-white px-2 py-1 shadow-sm',
        )}
      >
        <Image
          src={brand.logo}
          alt="VegaCore"
          width={s.width * 2}
          height={s.height * 2}
          className={clsx(
            'h-auto w-auto max-h-full object-contain object-start',
            variant === 'icon' && 'max-w-[40px]',
          )}
          style={{ maxWidth: s.width, maxHeight: s.height }}
          priority
        />
      </div>
      {showText && variant !== 'icon' && (
        <div className="min-w-0">
          <p
            className={clsx(
              'font-bold tracking-[0.12em] leading-tight text-sm',
              variant === 'light' ? 'text-white' : 'text-[var(--color-text)]',
            )}
          >
            VEGA<span className="text-[var(--vega-cyan)]">CORE</span>
          </p>
        </div>
      )}
    </div>
  );
}
