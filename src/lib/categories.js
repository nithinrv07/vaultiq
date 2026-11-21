// Category catalogue + keyword categoriser + learned-rule engine.

export const CATEGORIES = [
  { id: 'Income', color: '#2f9e6b', kind: 'income' },
  { id: 'Housing', color: '#3b5bdb', kind: 'fixed' },
  { id: 'Utilities', color: '#4c8bd6', kind: 'fixed' },
  { id: 'Insurance', color: '#5c6f9e', kind: 'fixed' },
  { id: 'Groceries', color: '#7aa63a', kind: 'variable' },
  { id: 'Dining', color: '#e8734a', kind: 'variable' },
  { id: 'Transport', color: '#d9a52b', kind: 'variable' },
  { id: 'Shopping', color: '#c2508a', kind: 'variable' },
  { id: 'Subscriptions', color: '#8b5cf6', kind: 'variable' },
  { id: 'Entertainment', color: '#e0567a', kind: 'variable' },
  { id: 'Health', color: '#1aa3a3', kind: 'variable' },
  { id: 'Education', color: '#6e7bd9', kind: 'variable' },
  { id: 'Travel', color: '#2a9fd6', kind: 'variable' },
  { id: 'Personal Care', color: '#d77fb3', kind: 'variable' },
  { id: 'Fees', color: '#a35b3f', kind: 'variable' },
  { id: 'Cash', color: '#8a8f7a', kind: 'variable' },
  { id: 'Transfers', color: '#7b8794', kind: 'transfer' },
  { id: 'Savings', color: '#1f7a55', kind: 'transfer' },
  { id: 'Other', color: '#a3a89a', kind: 'variable' },
];

export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const catColor = (id) => (CAT[id] || CAT.Other).color;
export const SPEND_CATS = CATEGORIES.filter((c) => c.kind === 'variable' || c.kind === 'fixed').map((c) => c.id);
export const isSpendCat = (id) => SPEND_CATS.includes(id);

const KEYWORDS = [
  ['Income', ['salary', 'payroll', 'sal cr', 'interest credit', 'int.pd', 'dividend', 'refund', 'cashback', 'stipend', 'bonus', 'freelance']],
  ['Housing', ['rent', 'landlord', 'maintenance', 'society', 'nobroker', 'housing', 'mortgage', 'home loan', 'emi hdfc ltd']],
  ['Utilities', ['electricity', 'tneb', 'bescom', 'tata power', 'water bill', 'gas', 'indane', 'bharat gas', 'broadband', 'jio', 'airtel', 'vodafone', 'vi postpaid', 'bsnl', 'act fibernet', 'recharge', 'dth', 'tata play']],
  ['Insurance', ['insurance', 'lic ', 'policybazaar', 'acko', 'hdfc ergo', 'icici lombard', 'star health', 'premium']],
  ['Groceries', ['bigbasket', 'blinkit', 'zepto', 'dmart', 'grofers', 'instamart', 'reliance fresh', 'more retail', 'grocery', 'supermarket', 'nilgiris', 'jiomart', 'spencer', 'kirana', 'milk', 'country delight']],
  ['Dining', ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'starbucks', 'dominos', 'pizza', 'mcdonald', 'kfc', 'burger', 'eatsure', 'biryani', 'bakery', 'chai', 'food', 'dine', 'barbeque']],
  ['Transport', ['uber', 'ola', 'rapido', 'metro', 'irctc', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'indian oil', 'iocl', 'fastag', 'parking', 'redbus', 'namma yatri', 'shell']],
  ['Subscriptions', ['netflix', 'spotify', 'prime', 'hotstar', 'disney', 'youtube', 'apple.com', 'icloud', 'google one', 'google storage', 'sonyliv', 'zee5', 'jiocinema', 'audible', 'kindle', 'chatgpt', 'openai', 'notion', 'adobe', 'microsoft 365', 'linkedin premium', 'gym', 'cult.fit', 'cultfit', 'membership', 'subscription', 'patreon', 'medium']],
  ['Shopping', ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'croma', 'reliance digital', 'ikea', 'decathlon', 'tata cliq', 'lifestyle', 'zara', 'h&m', 'uniqlo', 'store', 'mart']],
  ['Entertainment', ['bookmyshow', 'pvr', 'inox', 'cinema', 'concert', 'steam', 'playstation', 'xbox', 'game', 'district']],
  ['Health', ['pharmacy', 'apollo', 'medplus', '1mg', 'pharmeasy', 'netmeds', 'hospital', 'clinic', 'doctor', 'diagnostic', 'lab', 'dental', 'practo']],
  ['Education', ['udemy', 'coursera', 'school', 'college', 'tuition', 'fees univ', 'books', 'byju', 'unacademy', 'exam']],
  ['Travel', ['makemytrip', 'goibibo', 'cleartrip', 'indigo', 'air india', 'vistara', 'akasa', 'spicejet', 'hotel', 'oyo', 'airbnb', 'booking.com', 'agoda', 'yatra']],
  ['Personal Care', ['salon', 'spa', 'barber', 'urban company', 'urbanclap', 'grooming', 'parlour']],
  ['Fees', ['charges', 'fee', 'penalty', 'gst on', 'annual fee', 'late payment', 'sms chg', 'amc']],
  ['Cash', ['atm', 'cash wdl', 'cash withdrawal', 'nwd', 'atw']],
  ['Savings', ['sip', 'mutual fund', 'zerodha', 'groww', 'kuvera', 'ppf', 'nps', 'recurring deposit', 'rd inst', 'fixed deposit', 'fd booked']],
  ['Transfers', ['self transfer', 'own account', 'credit card payment', 'cc payment', 'card bill', 'bill desk cc', 'neft to self']],
];

const NOISE = /\b(upi|pos|neft|imps|rtgs|ach|nach|ecom|vpa|ref|txn|trf|transfer|to|from|by|via|payment|paid|purchase|debit|credit|dr|cr|card|xx+\d*|ltd|pvt|private|limited|india|in|pay|the|ind|mumbai|bangalore|bengaluru|chennai|delhi|hyderabad|pune|online|www|com)\b/g;

/** Turn a noisy bank description into a stable merchant key used for learning rules. */
export function merchantKey(desc = '') {
  let s = String(desc).toLowerCase();
  s = s.replace(/@[a-z0-9.]+/g, ' '); // vpa handle domains
  s = s.replace(/[0-9]{3,}/g, ' ');
  s = s.replace(/[^a-z&.\s]/g, ' ').replace(/\./g, ' ');
  s = s.replace(NOISE, ' ');
  const words = [...new Set(s.split(/\s+/).filter((w) => w.length > 1))];
  return words.slice(0, 2).join(' ') || String(desc).toLowerCase().trim().slice(0, 24);
}

export function prettyMerchant(desc = '') {
  const k = merchantKey(desc);
  return k.replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Categorise a transaction. Order: user-learned rules (exact merchant key, then
 * "contains" patterns) → built-in keyword table → sign-based fallback.
 * Returns { category, via } so the UI can show *why* something was categorised.
 */
export function categorize(tx, rules = []) {
  const key = merchantKey(tx.description);
  const lower = ` ${String(tx.description).toLowerCase()} `;
  for (const r of rules) {
    if (r.match === 'key' && r.pattern === key) return { category: r.category, via: 'rule' };
  }
  for (const r of rules) {
    if (r.match === 'contains' && lower.includes(r.pattern.toLowerCase())) return { category: r.category, via: 'rule' };
  }
  for (const [cat, words] of KEYWORDS) {
    if (cat === 'Income' && tx.amount < 0) continue;
    if (words.some((w) => lower.includes(w))) return { category: cat, via: 'auto' };
  }
  if (tx.amount > 0) return { category: /transfer|imps|neft|upi/i.test(tx.description) ? 'Transfers' : 'Income', via: 'auto' };
  return { category: 'Other', via: 'auto' };
}
