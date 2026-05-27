import Image from 'next/image';
import clsx from 'clsx';
import { brand } from '@/lib/brand';

interface BrandLogoStackProps {
  size?: 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function BrandLogoStack({ size = 'lg', align = 'end', className }: BrandLogoStackProps) {
  const width = size === 'lg' ? 240 : 180;
  const height = size === 'lg' ? 72 : 54;

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
        src={brand.logo}
        alt="VegaCore"
        width={width * 2}
        height={height * 2}
        className="h-auto object-contain"
        style={{ width, maxHeight: height }}
        priority
      />
      <p className="text-[11px] text-[#5c6478] tracking-wide">Operating System</p>
    </div>
  );
}
