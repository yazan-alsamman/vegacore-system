'use client';

import { brand } from '@/lib/brand';

/** Animated VegaCore mark — stroke draw then full logo reveal */
export function LoginLogoDraw({ phase }: { phase: 'drawing' | 'reveal' | 'done' }) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Glow behind logo */}
      <div
        className="login-glow absolute inset-0 -z-10 rounded-full blur-3xl opacity-60"
        aria-hidden
      />

      {/* SVG stroke draw — abstract V + network (brand identity) */}
      <svg
        viewBox="0 0 200 120"
        className={`w-[min(72vw,280px)] h-auto transition-opacity duration-700 ${
          phase === 'reveal' || phase === 'done' ? 'opacity-0 scale-95' : 'opacity-100'
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="vega-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2E3192" />
            <stop offset="55%" stopColor="#00AEEF" />
            <stop offset="100%" stopColor="#00A651" />
          </linearGradient>
        </defs>
        {/* Left V block */}
        <path
          className="login-draw-path"
          pathLength={1}
          d="M28 18 L28 98 L52 98 L78 58 L52 18 Z"
          stroke="url(#vega-stroke)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Network lines */}
        <path
          className="login-draw-path login-draw-delay-1"
          pathLength={1}
          d="M78 38 H138"
          stroke="url(#vega-stroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          className="login-draw-path login-draw-delay-2"
          pathLength={1}
          d="M138 38 L168 58 L138 78"
          stroke="url(#vega-stroke)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          className="login-draw-path login-draw-delay-3"
          pathLength={1}
          d="M118 58 H168"
          stroke="url(#vega-stroke)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle className="login-draw-dot login-draw-delay-4" cx="168" cy="38" r="4" fill="#00AEEF" />
        <circle className="login-draw-dot login-draw-delay-4" cx="168" cy="78" r="4" fill="#00AEEF" />
        <circle className="login-draw-dot login-draw-delay-5" cx="138" cy="58" r="3.5" fill="#00AEEF" />
        {/* Wordmark underline sketch */}
        <path
          className="login-draw-path login-draw-delay-6"
          pathLength={1}
          d="M40 108 H160"
          stroke="url(#vega-stroke)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Full logo PNG — clip reveal */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-out ${
          phase === 'drawing' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
        }`}
      >
        <div className="login-logo-reveal overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoSidebar}
            alt="VegaCore"
            width={280}
            className="block h-auto w-[min(70vw,260px)] object-contain drop-shadow-2xl"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
