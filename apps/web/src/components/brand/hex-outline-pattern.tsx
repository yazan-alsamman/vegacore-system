export function HexOutlinePattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`text-[#231F20]/[0.12] ${className}`}
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M50 10 L90 10 L110 45 L90 80 L50 80 L30 45 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M110 10 L150 10 L170 45 L150 80 L110 80 L90 45 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M50 80 L90 80 L110 115 L90 150 L50 150 L30 115 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M110 80 L150 80 L170 115 L150 150 L110 150 L90 115 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M80 45 L110 45 L125 70 L110 95 L80 95 L65 70 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M130 45 L160 45 L175 70 L160 95 L130 95 L115 70 Z" stroke="currentColor" strokeWidth="0.75" />
      <path d="M20 45 L50 45 L65 70 L50 95 L20 95 L5 70 Z" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}
