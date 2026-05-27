'use client';

import { useEffect, useState } from 'react';
import { LoginLogoDraw } from './login-logo-draw';

interface LoginIntroProps {
  onComplete: () => void;
}

export function LoginIntro({ onComplete }: LoginIntroProps) {
  const [phase, setPhase] = useState<'drawing' | 'reveal' | 'done'>('drawing');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase('reveal'), 2400);
    const t2 = setTimeout(() => setPhase('done'), 3400);
    const t3 = setTimeout(() => setExiting(true), 3800);
    const t4 = setTimeout(() => onComplete(), 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`login-intro-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ${
        exiting ? 'login-intro-exit' : ''
      }`}
      aria-hidden={exiting}
    >
      {/* Animated mesh background */}
      <div className="login-mesh absolute inset-0" aria-hidden />
      <div className="login-orb login-orb-1 absolute" aria-hidden />
      <div className="login-orb login-orb-2 absolute" aria-hidden />
      <div className="login-orb login-orb-3 absolute" aria-hidden />

      {/* Accent line sweep */}
      <div className="login-accent-sweep absolute inset-x-0 top-0 h-1" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <LoginLogoDraw phase={phase} />

        <div
          className={`text-center transition-all duration-700 delay-300 ${
            phase === 'drawing' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <p className="text-sm font-semibold tracking-[0.35em] text-white/90 uppercase">
            VegaCore
          </p>
          <p className="mt-2 text-xs text-white/50 tracking-widest">Operating System</p>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div className="login-progress-bar h-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
