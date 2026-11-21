import { createContext, useContext, useEffect, useState } from 'react';
import { firebaseConfigured, signOutUser, watchAuth } from './lib/firebase.js';

const GUEST_KEY = 'zvault:guest';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [guest, setGuestState] = useState(() => localStorage.getItem(GUEST_KEY) === '1');

  useEffect(() => {
    let off = () => {};
    watchAuth((u) => { setUser(u); setLoading(false); if (u) { localStorage.removeItem(GUEST_KEY); setGuestState(false); } })
      .then((fn) => { off = fn; })
      .catch(() => setLoading(false));
    return () => off();
  }, []);

  const value = {
    user, loading, guest, configured: firebaseConfigured,
    signedIn: !!user || guest,
    continueAsGuest() { localStorage.setItem(GUEST_KEY, '1'); setGuestState(true); },
    async signOut() { localStorage.removeItem(GUEST_KEY); setGuestState(false); await signOutUser(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
