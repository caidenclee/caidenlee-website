'use client';

import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only show on iOS Safari when not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode =
      'standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem('faith_install_dismissed') === 'true';

    if (isIOS && !isInStandaloneMode && !dismissed) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('faith_install_dismissed', 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mx-4 mb-2 animate-slide-up">
      <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
        <p className="text-2xl shrink-0">📱</p>
        <p className="text-white/60 text-xs leading-snug flex-1">
          Add Faith to your Home Screen:{' '}
          <span className="text-white/80">Safari → Share</span> →{' '}
          <span className="text-white/80">Add to Home Screen</span>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/60 transition-smooth"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
