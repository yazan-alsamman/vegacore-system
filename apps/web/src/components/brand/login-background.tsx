'use client';

import { HexOutlinePattern } from './hex-outline-pattern';

export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="login-mesh absolute inset-0 opacity-90" />
      <div className="login-orb login-orb-1 absolute opacity-80" />
      <div className="login-orb login-orb-2 absolute opacity-70" />
      <div className="login-orb login-orb-3 absolute opacity-60" />
      <HexOutlinePattern className="absolute -top-8 -end-8 w-56 h-48 text-white/[0.06] login-float-slow" />
      <HexOutlinePattern className="absolute bottom-12 -start-12 w-40 h-36 text-white/[0.04] login-float-slow-reverse" />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
