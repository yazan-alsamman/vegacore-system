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

    const t1 = window.setTimeout(() => setPhase('reveal'), 2200);
    const t2 = window.setTimeout(() => setPhase('done'), 3200);
    const t3 = window.setTimeout(() => setExiting(true), 3600);
    const t4 = window.setTimeout(() => onComplete(), 4400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className={exiting ? 'login-intro-screen is-exiting' : 'login-intro-screen'} role="dialog" aria-label="Loading">
      <div className="login-mesh absolute inset-0" />
      <div className="login-orb login-orb-1 absolute" />
      <div className="login-orb login-orb-2 absolute" />
      <div className="login-orb login-orb-3 absolute" />
      <div className="login-accent-sweep absolute inset-x-0 top-0" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <LoginLogoDraw phase={phase} />

        <div
          style={{
            textAlign: 'center',
            opacity: phase === 'drawing' ? 0 : 1,
            transform: phase === 'drawing' ? 'translateY(12px)' : 'translateY(0)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
            VegaCore
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
            Operating System
          </p>
        </div>

        <div className="login-progress-track">
          <div className="login-progress-bar" />
        </div>
      </div>
    </div>
  );
}
