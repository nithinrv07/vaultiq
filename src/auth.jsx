import { createContext, useContext, useEffect, useState } from 'react';
import { cloudConfigured, signOutUser, updatePassword, watchAuth } from './lib/cloud.js';

const GUEST_KEY = 'zvault:guest';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(cloudConfigured);
  const [guest, setGuestState] = useState(() => localStorage.getItem(GUEST_KEY) === '1');

  useEffect(() => {
    let off = () => {};
    // True when we've just come back from Google or an email link (?code=…).
    let returning = /[?&]code=/.test(window.location.search);
    const onEvent = async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        const pw = window.prompt('Choose a new password (at least 6 characters):');
        if (pw && pw.length >= 6) { try { await updatePassword(pw); window.alert('Password updated.'); } catch (e) { window.alert(e.message); } }
      }
    };
    watchAuth((u) => {
      setUser(u); setLoading(false);
      if (u) { localStorage.removeItem(GUEST_KEY); setGuestState(false); }
      if (u && returning) {
        returning = false;
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
        if (!window.location.hash.startsWith('#/app')) window.location.hash = '#/app/dashboard';
      }
    }, onEvent)
      .then((fn) => { off = fn; })
      .catch(() => setLoading(false));
    return () => off();
  }, []);

  const value = {
    user, loading, guest, configured: cloudConfigured,
    signedIn: !!user || guest,
    continueAsGuest() { localStorage.setItem(GUEST_KEY, '1'); setGuestState(true); },
    async signOut() { localStorage.removeItem(GUEST_KEY); setGuestState(false); await signOutUser(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
