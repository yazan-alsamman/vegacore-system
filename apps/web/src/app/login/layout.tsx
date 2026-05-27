'use client';

import { useEffect } from 'react';
import './login.css';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('login-active');
    document.body.classList.add('login-active');
    return () => {
      document.documentElement.classList.remove('login-active');
      document.body.classList.remove('login-active');
    };
  }, []);

  return <>{children}</>;
}
