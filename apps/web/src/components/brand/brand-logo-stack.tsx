import Image from 'next/image';
import clsx from 'clsx';

interface BrandLogoStackProps {
  size?: 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function BrandLogoStack({ size = 'lg', align = 'end', className }: BrandLogoStackProps) {
  const iconSize = size === 'lg' ? 48 : 36;

  return (
    <div
      className={clsx(
        'flex flex-col gap-2',
        align === 'end' && 'items-end text-end',
        align === 'center' && 'items-center text-center',
        align === 'start' && 'items-start text-start',
        className,
      )}
    >
      <Image
        src="/brand/logo.png"
        alt="VegaCore"
        width={iconSize * 2}
        height={iconSize * 2}
        className="object-contain"
        style={{ width: iconSize, height: iconSize }}
        priority
      />
      <div>
        <p
          className={clsx(
            'font-bold tracking-[0.2em] text-[#231F20] leading-none',
            size === 'lg' ? 'text-lg' : 'text-base',
          )}
        >
          VEGACORE
        </p>
        <p className="mt-1 text-[11px] text-[#5c6478] tracking-wide">Operating System</p>
      </div>
    </div>
  );
}
