import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { categorize, merchantKey } from './lib/categories.js';
import { setCurrency, todayStr, addDays, ymd, uid } from './lib/format.js';
import { baselineSpend, buildNudges, detectRecurring } from './lib/model.js';
import { sampleProfile, sampleTransactions } from './lib/sample.js';

const KEY = 'zvault:v1';
const LEGACY_KEY = 'evergreen:v1';
const Ctx = createContext(null);

const emptyProfile = () => ({ name: '', currency: 'INR', monthlyIncome: 0, fixedCosts: [], emergencyFund: { current: 0, targetMonths: 6 }, goals: [], budgets: {} });
const initial = () => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)); if (s?.profile) return s; } catch { /* ignore */ }
  return { txs: [], rules: [], profile: emptyProfile(), usage: {}, ruleLog: [] };
};

export function StoreProvider({ children }) {
  const [state, setState] = useState(initial);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  setCurrency(state.profile.currency);

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

  return <Ctx.Provider value={{ ...state, ...derived, ...api }}>{children}</Ctx.Provider>;
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
