import { useEffect, useState } from 'react';

// Capture the browser's install prompt as early as possible (it fires once, before React mounts).
let deferred = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((fn) => fn()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((fn) => fn()); });
}

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force((n) => n + 1); listeners.add(fn); return () => listeners.delete(fn); }, []);
  return {
    canInstall: !!deferred && !standalone(),
    iosHint: isIOS() && !standalone(),
    async prompt() { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; force((n) => n + 1); },
  };
}
