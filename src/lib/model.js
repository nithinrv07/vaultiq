// The "living money model": stats, recurring detection, simulation, nudges, review.
import { CAT, isSpendCat, merchantKey, prettyMerchant } from './categories.js';
import { addDays, addMonths, daysBetween, monthKey, ymd, money, monthLabel } from './format.js';

/* ---------------- Monthly stats ---------------- */
export function monthlyStats(txs) {
  const months = {};
  for (const t of txs) {
    const mk = monthKey(t.date);
    const m = (months[mk] ||= { month: mk, income: 0, spend: 0, saved: 0, byCat: {}, count: 0 });
    m.count++;
    if (t.category === 'Income') m.income += t.amount;
    else if (t.category === 'Savings') m.saved += -t.amount;
    else if (isSpendCat(t.category) && t.amount < 0) {
      m.spend += -t.amount;
      m.byCat[t.category] = (m.byCat[t.category] || 0) + -t.amount;
    } else if (isSpendCat(t.category) && t.amount > 0) {
      // refunds reduce the category
      m.spend -= t.amount;
      m.byCat[t.category] = (m.byCat[t.category] || 0) - t.amount;
    }
  }
  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

/** Average spend per category across the last N *complete* months (falls back to what exists). */
export function baselineSpend(txs, n = 3) {
  const stats = monthlyStats(txs);
  const cur = monthKey(new Date());
  let done = stats.filter((s) => s.month < cur).slice(-n);
  if (!done.length) done = stats.slice(-1);
  const out = {};
  for (const s of done) for (const [c, v] of Object.entries(s.byCat)) out[c] = (out[c] || 0) + v / done.length;
  const income = done.reduce((a, s) => a + s.income, 0) / (done.length || 1);
  return { byCat: out, income, months: done.length };
}

/* ---------------- Recurring / subscriptions ---------------- */
const CADENCES = [
  { id: 'weekly', days: 7, tol: 2 },
  { id: 'monthly', days: 30.4, tol: 5 },
  { id: 'quarterly', days: 91, tol: 10 },
  { id: 'yearly', days: 365, tol: 15 },
];

export function detectRecurring(txs, usage = {}, today = new Date()) {
  const groups = {};
  for (const t of txs) {
    if (t.amount >= 0 || t.category === 'Transfers') continue;
    const k = merchantKey(t.description);
    (groups[k] ||= []).push(t);
  }
  const out = [];
  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    // collapse same-day duplicates
    const items = list.filter((t, i) => i === 0 || t.date !== list[i - 1].date);
    if (items.length < 2) continue;
    const gaps = items.slice(1).map((t, i) => daysBetween(items[i].date, t.date));
    const med = median(gaps);
    const cad = CADENCES.find((c) => Math.abs(med - c.days) <= c.tol);
    if (!cad) continue;
    const regular = gaps.filter((g) => Math.abs(g - cad.days) <= cad.tol * 1.6).length / gaps.length;
    const amts = items.map((t) => -t.amount);
    const recent = amts.slice(-4);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const cv = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length) / mean;
    const subLike = ['Subscriptions', 'Utilities', 'Housing', 'Insurance', 'Savings', 'Education'].includes(items.at(-1).category);
    const minCount = subLike ? 2 : 3;
    if (items.length < minCount || regular < 0.6) continue;
    if (!subLike && (cv > 0.12 || items.length < 4)) continue;
    // weekly + variable categories are usually habits not subscriptions
    if (cad.id === 'weekly' && !subLike) continue;

    const last = items.at(-1);
    const prev = items.at(-2);
    const lastAmt = -last.amount;
    const prevAmt = items.slice(-3, -1).map((t) => -t.amount).reverse().find((a) => Math.abs(a - lastAmt) >= 1) ?? -prev.amount;
    const next = cad.id === 'monthly' ? addMonths(last.date, 1) : addDays(last.date, Math.round(cad.days));
    const monthly = cad.id === 'weekly' ? lastAmt * 4.33 : cad.id === 'monthly' ? lastAmt : cad.id === 'quarterly' ? lastAmt / 3 : lastAmt / 12;
    const u = usage[key] || {};
    const alerts = [];
    const change = (lastAmt - prevAmt) / prevAmt;
    const thresh = last.category === 'Utilities' ? 0.15 : 0.03;
    if (Math.abs(change) >= thresh && Math.abs(lastAmt - prevAmt) >= 1) {
      alerts.push({ type: change > 0 ? 'price-up' : 'price-down', text: `${change > 0 ? 'Went up' : 'Dropped'} ${Math.abs(change * 100).toFixed(0)}% (${money(prevAmt)} → ${money(lastAmt)})` });
    }
    const overdue = daysBetween(next, today);
    if (overdue > cad.tol + 3 && overdue < cad.days * 2.5) alerts.push({ type: 'missed', text: `Expected around ${ymd(next)} but no charge seen — cancelled or failed?` });
    const isSub = ['Subscriptions', 'Entertainment'].includes(last.category);
    if (isSub && u.status !== 'cancel') {
      const lu = u.lastUsed ? daysBetween(u.lastUsed, today) : null;
      if (lu === null && items.length >= 3) alerts.push({ type: 'unused', text: `Paid ${items.length}× — you haven't confirmed using it. Still worth it?` });
      else if (lu !== null && lu > 30) alerts.push({ type: 'unused', text: `Last used ${lu} days ago — that's ${money(monthly * (lu / 30.4))} paid since.` });
    }
    out.push({
      key, name: prettyMerchant(last.description), category: last.category, cadence: cad.id,
      lastAmount: lastAmt, prevAmount: prevAmt, monthly, lastDate: last.date, nextDate: ymd(next),
      count: items.length, history: items.map((t) => ({ date: t.date, amount: -t.amount })),
      regularity: regular, alerts, status: u.status || 'active', lastUsed: u.lastUsed || null,
    });
  }
  return out.sort((a, b) => b.monthly - a.monthly);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* ---------------- Profile helpers ---------------- */
export function fixedTotal(profile) {
  return profile.fixedCosts.reduce((a, f) => a + Number(f.amount || 0), 0);
}
export function essentialMonthly(profile, base) {
  const ess = ['Groceries', 'Utilities', 'Health', 'Transport', 'Insurance'];
  const v = ess.reduce((a, c) => a + (profile.fixedCosts.some((f) => f.category === c) ? 0 : base.byCat[c] || 0), 0);
  return fixedTotal(profile) + v;
}
export function variableSpend(profile, base) {
  const fixedCats = new Set(profile.fixedCosts.map((f) => f.category));
  let v = 0;
  for (const [c, amt] of Object.entries(base.byCat)) if (!fixedCats.has(c)) v += amt;
  return v;
}

/* ---------------- What-if simulation ---------------- */
/**
 * scenario: { cuts: {Dining: 0.3}, rentDelta: 2000, incomeDelta: 0.1, extraSaving: 0, oneOff: 0 }
 * Each month: surplus = income − fixed − variable. Surplus fills the emergency fund first
 * (up to 50% of surplus while goals exist) and the rest goes to goals weighted by urgency.
 */
export function simulate(profile, base, scenario = {}, horizon = 84) {
  const cuts = scenario.cuts || {};
  const income = (Number(profile.monthlyIncome) || base.income) * (1 + (scenario.incomeDelta || 0));
  const fixedCats = new Set(profile.fixedCosts.map((f) => f.category));
  let fixed = 0;
  for (const f of profile.fixedCosts) {
    const cut = cuts[f.category] || 0;
    fixed += Number(f.amount || 0) * (1 - cut);
  }
  fixed += scenario.rentDelta || 0;
  let variable = 0;
  const byCat = {};
  for (const [c, amt] of Object.entries(base.byCat)) {
    if (fixedCats.has(c)) continue;
    byCat[c] = amt * (1 - (cuts[c] || 0));
    variable += byCat[c];
  }
  const surplus = income - fixed - variable + (scenario.extraSaving || 0);
  const essentials = essentialMonthly(profile, base) + (scenario.rentDelta || 0);
  const efTarget = essentials * (Number(profile.emergencyFund.targetMonths) || 6);
  let ef = Number(profile.emergencyFund.current) || 0;
  ef -= scenario.oneOff || 0;
  const today = new Date();
  const goals = profile.goals.map((g) => ({ ...g, saved: Number(g.saved) || 0, target: Number(g.target) || 0, doneAt: null }));
  let efDoneAt = ef >= efTarget ? 0 : null;
  const series = [];
  for (let m = 1; m <= horizon; m++) {
    let pool = Math.max(0, surplus);
    if (surplus < 0) ef += surplus; // deficit eats the cushion
    const open = goals.filter((g) => g.saved < g.target).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (ef < efTarget) {
      const share = open.length ? 0.3 : 1;
      const put = Math.min(pool * share, efTarget - ef);
      ef += put; pool -= put;
      if (ef >= efTarget && efDoneAt === null) efDoneAt = m;
    }
    // Fund goals in deadline order at the pace each one needs, then share what's left.
    for (const g of open) {
      if (pool <= 0) break;
      const left = Math.max(1, monthsUntil(today, g.date) - m + 1);
      const put = Math.min(pool, (g.target - g.saved) / left, g.target - g.saved);
      g.saved += put; pool -= put;
    }
    const still = open.filter((g) => g.saved < g.target - 0.5);
    if (pool > 0 && still.length) {
      const W = still.reduce((a, g) => a + (g.target - g.saved), 0);
      let given = 0;
      for (const g of still) { const put = Math.min(pool * ((g.target - g.saved) / W), g.target - g.saved); g.saved += put; given += put; }
      pool -= given;
    }
    ef += pool; // anything beyond goals accumulates as cash
    for (const g of open) if (g.saved >= g.target - 0.5 && g.doneAt === null) g.doneAt = m;
    if (ef >= efTarget && efDoneAt === null) efDoneAt = m;
    series.push({ m, date: ymd(addMonths(today, m)), ef: Math.max(ef, 0), goals: goals.reduce((a, g) => a + g.saved, 0), total: Math.max(ef, 0) + goals.reduce((a, g) => a + g.saved, 0) });
  }
  return {
    income, fixed, variable, surplus, byCat, efTarget, efDoneAt, essentials,
    savingsRate: income ? surplus / income : 0,
    goals: goals.map((g) => {
      const doneDate = g.doneAt ? addMonths(today, g.doneAt) : null;
      const deadline = new Date(g.date);
      return { ...g, doneDate: doneDate ? ymd(doneDate) : null, onTrack: !!doneDate && doneDate <= addDays(deadline, 15), slipMonths: doneDate ? Math.round(daysBetween(deadline, doneDate) / 30.4) : null, needPerMonth: Math.max(0, (Number(g.target) - (profile.goals.find((x) => x.id === g.id)?.saved || 0)) / Math.max(1, monthsUntil(today, g.date))) };
    }),
    series,
  };
}
export const monthsUntil = (from, to) => Math.max(0, (new Date(to).getFullYear() - from.getFullYear()) * 12 + new Date(to).getMonth() - from.getMonth());

/* ---------------- Budgets & nudges ---------------- */
export function effectiveBudgets(profile, base) {
  const b = {};
  for (const [c, v] of Object.entries(base.byCat)) if (CAT[c]?.kind === 'variable') b[c] = Math.round(v / 50) * 50 || v;
  return { ...b, ...Object.fromEntries(Object.entries(profile.budgets || {}).filter(([, v]) => v > 0)) };
}

export function buildNudges({ txs, profile, base, recurring, today = new Date() }) {
  const nudges = [];
  const mk = monthKey(today);
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const frac = today.getDate() / dim;
  const cur = monthlyStats(txs).find((s) => s.month === mk) || { byCat: {}, spend: 0, income: 0 };
  const budgets = effectiveBudgets(profile, base);
  for (const [c, b] of Object.entries(budgets)) {
    const s = cur.byCat[c] || 0;
    if (!b) continue;
    const projected = frac > 0.15 ? s / frac : s;
    if (s > b) nudges.push({ level: 'high', cat: c, title: `${c} is over plan`, body: `${money(s)} spent vs a ${money(b)} plan — ${money(s - b)} over with ${dim - today.getDate()} days left.`, action: { label: `Model cutting ${c.toLowerCase()}`, to: 'planner', cut: c } });
    else if (projected > b * 1.12 && s > b * 0.4) nudges.push({ level: 'mid', cat: c, title: `${c} is drifting`, body: `At this pace you'll land near ${money(projected)} (plan ${money(b)}). Easing off ~${money((projected - b) / Math.max(1, dim - today.getDate()))}/day keeps you on track.`, action: { label: 'See transactions', to: 'transactions', cat: c } });
  }
  // unusual single purchases
  const recent = txs.filter((t) => monthKey(t.date) === mk && t.amount < 0 && isSpendCat(t.category));
  for (const t of recent) {
    const avg = (base.byCat[t.category] || 0);
    if (avg > 0 && -t.amount > Math.max(avg * 0.6, 1500) && t.category !== 'Housing') {
      nudges.push({ level: 'low', cat: t.category, title: 'Larger than usual purchase', body: `${money(-t.amount)} at ${prettyMerchant(t.description)} — that's ${Math.round((-t.amount / avg) * 100)}% of a typical month of ${t.category}.`, action: { label: 'Review it', to: 'transactions', q: prettyMerchant(t.description) } });
    }
  }
  for (const r of recurring) for (const a of r.alerts) {
    nudges.push({ level: a.type === 'price-up' || a.type === 'missed' ? 'mid' : 'low', cat: r.category, title: `${r.name}: ${a.type === 'price-up' ? 'price increase' : a.type === 'price-down' ? 'price drop' : a.type === 'missed' ? 'missed charge' : 'possibly unused'}`, body: a.text, action: { label: 'Open subscriptions', to: 'recurring' } });
  }
  const sim = simulate(profile, base);
  if (sim.surplus < 0) nudges.unshift({ level: 'high', title: 'Spending more than you earn', body: `Your model runs a ${money(-sim.surplus)} monthly gap. That comes out of your emergency fund.`, action: { label: 'Try a what-if', to: 'planner' } });
  const efMonths = (Number(profile.emergencyFund.current) || 0) / Math.max(1, sim.essentials);
  if (efMonths < 3) nudges.push({ level: 'mid', title: 'Thin safety cushion', body: `Your emergency fund covers ${efMonths.toFixed(1)} months of essentials. A common rule of thumb is 3–6 months.`, action: { label: 'Update profile', to: 'profile' } });
  for (const g of sim.goals) if (!g.onTrack && g.saved < g.target) nudges.push({ level: 'mid', title: `"${g.name}" is behind`, body: g.doneDate ? `Projected ${monthLabel(monthKey(g.doneDate), true)} — ${g.slipMonths} month(s) after your target date.` : `At the current surplus this goal isn't reached within 7 years.`, action: { label: 'Plan it', to: 'planner' } });
  const order = { high: 0, mid: 1, low: 2 };
  return nudges.sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------------- Monthly review ---------------- */
export function monthlyReview({ txs, month, profile, base, recurring }) {
  const stats = monthlyStats(txs);
  const i = stats.findIndex((s) => s.month === month);
  const cur = stats[i] || { byCat: {}, spend: 0, income: 0, saved: 0, month };
  const prev = stats[i - 1] || null;
  const mtx = txs.filter((t) => monthKey(t.date) === month);
  const merchants = {};
  for (const t of mtx) if (t.amount < 0 && isSpendCat(t.category)) {
    const k = prettyMerchant(t.description);
    merchants[k] = merchants[k] || { name: k, total: 0, count: 0, category: t.category };
    merchants[k].total += -t.amount; merchants[k].count++;
  }
  const budgets = effectiveBudgets(profile, base);
  const cats = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ cat: c, amount: v, prev: prev?.byCat[c] || 0, budget: budgets[c] || null }));
  const net = cur.income - cur.spend;
  const insights = [];
  if (prev) {
    const d = cur.spend - prev.spend;
    insights.push(`Spending ${d >= 0 ? 'rose' : 'fell'} ${money(Math.abs(d))} versus ${monthLabel(prev.month, true)}.`);
    const movers = cats.map((c) => ({ ...c, d: c.amount - c.prev })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2);
    for (const m of movers) if (Math.abs(m.d) > 100) insights.push(`${m.cat} ${m.d > 0 ? 'up' : 'down'} ${money(Math.abs(m.d))}.`);
  }
  const over = cats.filter((c) => c.budget && c.amount > c.budget);
  if (over.length) insights.push(`Over plan in ${over.map((c) => c.cat).join(', ')}.`);
  else if (cats.length) insights.push('Every planned category stayed within budget.');
  if (cur.income) insights.push(`You kept ${money(net)} of ${money(cur.income)}${cur.saved ? `, and moved ${money(cur.saved)} into savings/investments` : ''}.`);
  const subs = recurring.filter((r) => r.history.some((h) => monthKey(h.date) === month));
  return { month, cur, prev, cats, merchants: Object.values(merchants).sort((a, b) => b.total - a.total).slice(0, 6), net, insights, subs, subsTotal: subs.reduce((a, r) => a + (r.history.find((h) => monthKey(h.date) === month)?.amount || 0), 0), count: mtx.length };
}
