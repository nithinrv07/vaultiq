export const CURRENCIES = {
  INR: { locale: 'en-IN', symbol: '₹' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
};

let current = 'INR';
export const setCurrency = (c) => { if (CURRENCIES[c]) current = c; };

export function money(n, opts = {}) {
  const { locale } = CURRENCIES[current];
  const v = Number(n) || 0;
  const compact = opts.compact && Math.abs(v) >= 100000;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: current,
    maximumFractionDigits: opts.decimals ?? (compact ? 1 : 0),
    notation: compact ? 'compact' : 'standard',
    signDisplay: opts.sign ? 'exceptZero' : 'auto',
  }).format(v);
}

export const pct = (n, d = 0) => `${(Number(n) * 100).toFixed(d)}%`;

export const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const monthKey = (d) => String(typeof d === 'string' ? d : ymd(d)).slice(0, 7);
export const monthLabel = (mk, long = false) => {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
};
export const shortDate = (d) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' });
export const longDate = (d) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const todayStr = () => ymd(new Date());

export function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export const uid = () => Math.random().toString(36).slice(2, 10);
