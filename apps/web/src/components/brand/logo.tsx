import Image from 'next/image';
import clsx from 'clsx';

interface LogoProps {
  variant?: 'default' | 'light' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 32, text: 'text-sm' },
  md: { icon: 40, text: 'text-base' },
  lg: { icon: 56, text: 'text-xl' },
};

export function Logo({ variant = 'default', size = 'md', showText = true, className }: LogoProps) {
  const s = SIZES[size];
  const isLight = variant === 'light';

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div
        className={clsx(
          'relative flex-shrink-0 overflow-hidden rounded-xl',
          variant === 'icon' && 'rounded-lg',
        )}
        style={{ width: s.icon, height: s.icon }}
      >
        <Image
          src="/brand/logo.png"
          alt="VegaCore"
          width={s.icon * 2}
          height={s.icon * 2}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      {showText && variant !== 'icon' && (
        <div className="min-w-0">
          <p
            className={clsx(
              'font-bold tracking-[0.12em] leading-tight',
              s.text,
              isLight ? 'text-white' : 'text-[var(--color-text)]',
            )}
          >
            VEGA<span className="text-[var(--vega-cyan)]">CORE</span>
          </p>
          {size !== 'sm' && (
            <p className={clsx('text-[10px] uppercase tracking-widest', isLight ? 'text-white/60' : 'text-[var(--color-text-secondary)]')}>
              Operating System
            </p>
          )}
        </div>
      )}
    </div>
  );
}
