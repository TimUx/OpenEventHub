'use client';

import { useEffect } from 'react';

/** Registers the portal service worker once in production-like builds. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Skip noisy re-registrations during local `next dev` HMR.
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Installability still works via manifest; SW is best-effort.
    });
  }, []);

  return null;
}
