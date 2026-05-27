'use client';

import clsx from 'clsx';
import { brand } from '@/lib/brand';

export function LoginLogoDraw({ phase }: { phase: 'drawing' | 'reveal' | 'done' }) {
  const showDraw = phase === 'drawing';
  const showLogo = phase === 'reveal' || phase === 'done';

  return (
    <div className="login-logo-stage">
      <div className="login-glow absolute inset-0 -z-10" aria-hidden />

      <svg
        className={clsx('draw-layer', !showDraw && 'is-hidden')}
        viewBox="0 0 200 120"
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
        <path
          className="login-draw-path"
          d="M28 18 L28 98 L52 98 L78 58 L52 18 Z"
          stroke="url(#vega-stroke)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          className="login-draw-path login-draw-delay-1"
          d="M78 38 H138"
          stroke="url(#vega-stroke)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="login-draw-path login-draw-delay-2"
          d="M138 38 L168 58 L138 78"
          stroke="url(#vega-stroke)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          className="login-draw-path login-draw-delay-3"
          d="M118 58 H168"
          stroke="url(#vega-stroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle className="login-draw-dot login-draw-delay-4" cx="168" cy="38" r="5" fill="#00AEEF" />
        <circle className="login-draw-dot login-draw-delay-4" cx="168" cy="78" r="5" fill="#00AEEF" />
        <circle className="login-draw-dot login-draw-delay-5" cx="138" cy="58" r="4" fill="#00AEEF" />
        <path
          className="login-draw-path login-draw-delay-6"
          d="M38 108 H162"
          stroke="url(#vega-stroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={clsx('login-logo-reveal-wrap', !showLogo && 'is-hidden')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logoSidebar} alt="VegaCore" width={280} height={120} decoding="async" />
      </div>
    </div>
  );
}
