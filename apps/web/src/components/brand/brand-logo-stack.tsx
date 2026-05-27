import clsx from 'clsx';
import { brand } from '@/lib/brand';

interface BrandLogoStackProps {
  size?: 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/** Login page — standard logo on light background */
export function BrandLogoStack({ size = 'lg', align = 'end', className }: BrandLogoStackProps) {
  const width = size === 'lg' ? 260 : 200;

  return (
    <div
      className={clsx(
        'flex flex-col gap-3',
        align === 'end' && 'items-end text-end',
        align === 'center' && 'items-center text-center',
        align === 'start' && 'items-start text-start',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logoLogin}
        alt="VegaCore"
        width={width}
        className="block h-auto object-contain"
        style={{ width, height: 'auto' }}
        decoding="async"
      />
      <p className="text-[11px] text-[#5c6478] tracking-wide">Operating System</p>
    </div>
  );
}
