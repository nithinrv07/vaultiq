import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadCloudState, saveCloudState } from './lib/cloud.js';
import { categorize, merchantKey } from './lib/categories.js';
import { setCurrency, todayStr, addDays, ymd, uid } from './lib/format.js';
import { baselineSpend, buildNudges, detectRecurring } from './lib/model.js';
import { sampleProfile, sampleTransactions } from './lib/sample.js';

const KEY = 'zvault:v1';
const LEGACY_KEY = 'evergreen:v1';
const Ctx = createContext(null);

const emptyProfile = () => ({ name: '', currency: 'INR', monthlyIncome: 0, fixedCosts: [], emergencyFund: { current: 0, targetMonths: 6 }, goals: [], budgets: {} });
const keyFor = (uid) => (uid ? `${KEY}:${uid}` : KEY);
const initial = (uid) => {
  // Signed-in users get their own cache; on first sign-in it is seeded from guest data.
  for (const k of [keyFor(uid), KEY, LEGACY_KEY]) {
    try { const s = JSON.parse(localStorage.getItem(k)); if (s?.profile) return s; } catch { /* ignore */ }
  }
  return { txs: [], rules: [], profile: emptyProfile(), usage: {}, ruleLog: [] };
};

/** Mount with key={uid} so each account gets a fresh provider. */
export function StoreProvider({ uid = null, children }) {
  const [state, setState] = useState(() => initial(uid));
  const [sync, setSync] = useState(uid ? 'loading' : 'local'); // local | loading | saving | synced | error
  const loaded = useRef(!uid);
  useEffect(() => { localStorage.setItem(keyFor(uid), JSON.stringify(state)); }, [state, uid]);

  // Pull the account's data once; if the account is new, push what's on this device.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    loadCloudState(uid)
      .then(async (remote) => {
        if (!alive) return;
        if (remote?.profile) setState(remote);
        else await saveCloudState(uid, state);
        loaded.current = true;
        setSync('synced');
      })
      .catch(() => { loaded.current = true; setSync('error'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Debounced push on every change.
  useEffect(() => {
    if (!uid || !loaded.current) return;
    setSync('saving');
    const t = setTimeout(() => saveCloudState(uid, state).then(() => setSync('synced')).catch(() => setSync('error')), 1200);
    return () => clearTimeout(t);
  }, [state, uid]);
  setCurrency('INR'); // Zvault works in rupees

  const recategorize = (txs, rules) => txs.map((t) => (t.manual ? t : { ...t, ...categorize(t, rules) }));

  const api = useMemo(() => ({
    addTransactions(list) {
      let added = 0;
      setState((s) => {
        const seen = new Set(s.txs.map((t) => t.id));
        const fresh = list.filter((t) => !seen.has(t.id) && (seen.add(t.id), true)).map((t) => ({ ...t, ...categorize(t, s.rules) }));
        added = fresh.length;
        return { ...s, txs: [...s.txs, ...fresh].sort((a, b) => b.date.localeCompare(a.date)) };
      });
      return () => added;
    },
    /** The correction loop: fix one transaction, learn a rule, re-apply to matching history. */
    correct(txId, category, { learn = true, scope = 'key' } = {}) {
      let affected = 0;
      setState((s) => {
        const tx = s.txs.find((t) => t.id === txId);
        if (!tx) return s;
        if (!learn) return { ...s, txs: s.txs.map((t) => (t.id === txId ? { ...t, category, via: 'manual', manual: true } : t)) };
        const key = merchantKey(tx.description);
        const rule = { id: uid(), match: scope, pattern: key, category, created: todayStr(), example: tx.description };
        const rules = [rule, ...s.rules.filter((r) => !(r.match === scope && r.pattern === key))];
        const txs = s.txs.map((t) => {
          if (t.id === txId) return { ...t, category, via: 'manual', manual: false };
          if (!t.manual && merchantKey(t.description) === key && t.category !== category) { affected++; return { ...t, category, via: 'rule' }; }
          return t;
        });
        return { ...s, rules, txs, ruleLog: [{ at: todayStr(), key, category, affected }, ...(s.ruleLog || [])].slice(0, 30) };
      });
      return () => affected;
    },
    deleteRule(id) { setState((s) => { const rules = s.rules.filter((r) => r.id !== id); return { ...s, rules, txs: recategorize(s.txs, rules) }; }); },
    deleteTx(id) { setState((s) => ({ ...s, txs: s.txs.filter((t) => t.id !== id) })); },
    setProfile(patch) { setState((s) => ({ ...s, profile: { ...s.profile, ...(typeof patch === 'function' ? patch(s.profile) : patch) } })); },
    setUsage(key, patch) { setState((s) => ({ ...s, usage: { ...s.usage, [key]: { ...(s.usage[key] || {}), ...patch } } })); },
    loadDemo() {
      const txs = sampleTransactions().map((t) => ({ ...t, ...categorize(t, []) })).sort((a, b) => b.date.localeCompare(a.date));
      const now = new Date();
      setState({
        txs, rules: [], profile: sampleProfile(), ruleLog: [],
        usage: { netflix: { lastUsed: ymd(addDays(now, -3)) }, spotify: { lastUsed: ymd(now) }, 'apple bill': { lastUsed: ymd(addDays(now, -2)) }, 'cult fit': { lastUsed: ymd(addDays(now, -52)) } },
      });
    },
    reset() { setState({ txs: [], rules: [], profile: emptyProfile(), usage: {}, ruleLog: [] }); },
  }), []);

  const derived = useMemo(() => {
    const base = baselineSpend(state.txs);
    if (!Object.keys(base.byCat).length && state.profile.fixedCosts.length) for (const f of state.profile.fixedCosts) base.byCat[f.category] = (base.byCat[f.category] || 0) + +f.amount;
    const recurring = detectRecurring(state.txs, state.usage);
    const nudges = buildNudges({ txs: state.txs, profile: state.profile, base, recurring });
    return { base, recurring, nudges };
  }, [state]);

  return <Ctx.Provider value={{ ...state, ...derived, ...api, sync }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = uid();
    setToasts((x) => [...x, { id, ...t }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.ms || 4200);
  }, []);
  return [toasts, push];
}
