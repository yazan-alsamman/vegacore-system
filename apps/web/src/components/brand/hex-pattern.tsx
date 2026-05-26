export function HexPattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 h-full w-full opacity-[0.07] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
          <path
            d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M28 36 L56 52 L56 84 L28 100 L0 84 L0 52 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" className="text-[#00AEEF]" />
    </svg>
  );
}
