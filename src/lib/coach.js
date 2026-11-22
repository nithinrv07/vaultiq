// Rule-based coach. It explains and models scenarios using the user's own numbers.
// Guardrail: it never recommends specific securities, funds, tickers or coins.
import { CATEGORIES } from './categories.js';
import { money, monthLabel, monthKey } from './format.js';
import { simulate } from './model.js';

const SECURITY_PATTERNS = [
  /\b(which|what|best|top|good|recommend|suggest|should i|tell me)\b.{0,40}\b(stock|share|equity|fund|mutual fund|etf|crypto|coin|token|bond|ipo|reit|option|futures|small[- ]?cap|large[- ]?cap|portfolio)s?\b/i,
  /\b(buy|sell|hold|short|invest in|put money in)\b.{0,30}\b([A-Z]{2,5}|stock|shares?|bitcoin|btc|eth|ethereum|dogecoin|solana|nifty|sensex|nasdaq|s&p|tesla|apple|reliance|tcs|infosys|hdfc bank|adani|nvidia|gold etf)\b/i,
  /\b(price target|stock tip|multibagger|hot stock|which coin|to the moon|ticker)\b/i,
];

export function isSecuritiesRequest(q) {
  return SECURITY_PATTERNS.some((re) => re.test(q));
}

export const GUARDRAIL_REPLY = {
  guardrail: true,
  text: `I can't recommend specific stocks, funds, coins or other securities — that's personalised investment advice, and it should come from a registered adviser who can assess your whole situation.

What I can do is help you get *ready* to invest and understand the concepts:
• Check your foundations first — emergency fund, high-interest debt, and goals with dates.
• Learn the trade-offs: risk vs. time horizon, diversification, costs (expense ratios, fees), and taxes.
• Model how much you could set aside each month without derailing your goals.

Try: "How much can I invest each month?" or "Explain diversification".`,
};

const CONCEPTS = {
  diversification: 'Diversification means spreading money across many assets so one bad outcome hurts less. It reduces the risk of any single holding, but not market-wide risk.',
  'emergency fund': 'An emergency fund is cash set aside for surprises — job loss, medical bills, repairs. A common rule of thumb is 3–6 months of essential expenses, kept somewhere safe and easy to access.',
  inflation: 'Inflation is the rise in prices over time. Money sitting idle loses purchasing power; a goal 5 years away will usually cost more than it does today.',
  compound: 'Compounding is earning returns on past returns. Time matters more than timing — small amounts started early can outgrow larger amounts started late.',
  'expense ratio': 'An expense ratio is the yearly fee a fund charges as a % of what you hold. Over decades, a 1% difference in fees can cost a large share of the final amount.',
  'risk': 'Risk is how much results can vary. Money needed soon is usually kept in lower-volatility places; money for goals far away can tolerate more ups and downs. Your horizon and comfort decide the mix.',
  '50/30/20': 'The 50/30/20 guideline splits take-home pay into ~50% needs, ~30% wants and ~20% savings. It is a starting point, not a rule — your fixed costs decide what is realistic.',
};

export function answer(q, ctx) {
  const text = q.trim();
  const lower = text.toLowerCase();
  if (!text) return { text: 'Ask me anything about your money model.' };
  if (isSecuritiesRequest(text)) return GUARDRAIL_REPLY;

  const { profile, base, txs, recurring } = ctx;
  const now = simulate(profile, base);

  // What-if: cut <category> by N%
  const cut = lower.match(/(?:cut|reduce|lower|spend less on|trim)\s+(?:my\s+)?([a-z ]+?)\s+(?:spending\s+)?by\s+(\d{1,3})\s*%/);
  if (cut) {
    const cat = matchCategory(cut[1]);
    if (cat) {
      const p = Math.min(100, +cut[2]) / 100;
      const s = simulate(profile, base, { cuts: { [cat]: p } });
      return { scenario: { cuts: { [cat]: p } }, text: `Cutting ${cat} by ${cut[2]}% frees about ${money(s.surplus - now.surplus)} a month (your ${cat.toLowerCase()} averages ${money(base.byCat[cat] || 0)}).\n\nLeft over each month: ${money(now.surplus)} → ${money(s.surplus)}.\n${goalDiff(now, s)}` };
    }
  }
  // What-if: rent goes up/down
  const rent = lower.match(/rent\s+(?:goes\s+|went\s+)?(up|down|increases?|decreases?|rises?|drops?)\s+(?:by\s+)?(?:rs\.?|₹|\$)?\s*([\d,]+)\s*(%)?/);
  if (rent) {
    const up = /up|increase|rise/.test(rent[1]);
    const curRent = profile.fixedCosts.filter((f) => f.category === 'Housing').reduce((a, f) => a + +f.amount, 0);
    const delta = (rent[3] ? curRent * (+rent[2].replace(/,/g, '') / 100) : +rent[2].replace(/,/g, '')) * (up ? 1 : -1);
    const s = simulate(profile, base, { rentDelta: delta });
    return { scenario: { rentDelta: delta }, text: `If rent ${up ? 'rises' : 'falls'} by ${money(Math.abs(delta))}, your monthly surplus moves from ${money(now.surplus)} to ${money(s.surplus)}, and your emergency-fund target ${up ? 'grows' : 'shrinks'} to ${money(s.efTarget)}.\n${goalDiff(now, s)}` };
  }
  // What-if: income change / raise / job loss
  const inc = lower.match(/(?:income|salary|pay)\s+(?:goes\s+)?(up|down|increases?|drops?|falls?|rises?)\s+(?:by\s+)?(\d{1,3})\s*%/) || lower.match(/(\d{1,3})\s*%\s+(raise|hike|pay cut)/);
  if (inc) {
    const n = +(inc[2] && /\d/.test(inc[2]) ? inc[2] : inc[1]);
    const down = /down|drop|fall|cut/.test(inc[0]);
    const d = (n / 100) * (down ? -1 : 1);
    const s = simulate(profile, base, { incomeDelta: d });
    return { scenario: { incomeDelta: d }, text: `With income ${down ? 'down' : 'up'} ${n}%, your surplus goes from ${money(now.surplus)} to ${money(s.surplus)} a month.\n${goalDiff(now, s)}` };
  }
  if (/lose my job|job loss|laid off|no income/.test(lower)) {
    const months = (+profile.emergencyFund.current || 0) / Math.max(1, now.essentials);
    return { text: `Your emergency fund of ${money(profile.emergencyFund.current)} covers about ${months.toFixed(1)} months of essentials (${money(now.essentials)}/month: fixed costs plus groceries, transport, health). Pausing goal contributions and discretionary spending would stretch it further.` };
  }
  if (/how am i doing|summary|overview|status|health/.test(lower)) {
    const onTrack = now.goals.filter((g) => g.onTrack).length;
    return { text: `Here's your model right now:\n• Income ${money(now.income)}, fixed costs ${money(now.fixed)}, flexible spending ${money(now.variable)}.\n• Left over: ${money(now.surplus)}/month (${money(now.surplus * 12)} a year).\n• Emergency fund: ${money(profile.emergencyFund.current)} of a ${money(now.efTarget)} target.\n• ${onTrack} of ${now.goals.length} goals are on track.` };
  }
  if (/where.*(money|spend)|biggest|top categor|spending most/.test(lower)) {
    const top = Object.entries(base.byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { text: `Your typical month (average of the last ${base.months} months):\n${top.map(([c, v]) => `• ${c}: ${money(v)}`).join('\n')}\n\nAsk "what if I cut ${top.find(([c]) => c !== 'Housing')?.[0] || 'Dining'} by 20%?" to see the effect.` };
  }
  if (/subscription|recurring/.test(lower)) {
    const total = recurring.filter((r) => r.category === 'Subscriptions').reduce((a, r) => a + r.monthly, 0);
    const flagged = recurring.filter((r) => r.alerts.length);
    return { text: `You have ${recurring.length} recurring payments; subscriptions alone cost ~${money(total)}/month (${money(total * 12)}/year).${flagged.length ? `\n\nWorth a look: ${flagged.map((r) => `${r.name} (${r.alerts[0].text})`).join('; ')}.` : ''}` };
  }
  if (/how much.*(invest|save)|can i (invest|save)|afford/.test(lower)) {
    const ef = now.efTarget - (+profile.emergencyFund.current || 0);
    return { text: `Your model leaves about ${money(now.surplus)} a month after fixed and flexible spending. ${ef > 0 ? `Your emergency fund is ${money(ef)} short of its target, so a cautious approach is to finish that first.` : 'Your emergency fund is fully funded.'} Goals need roughly ${money(now.goals.reduce((a, g) => a + g.needPerMonth, 0))}/month to hit their dates. What's left over is what you could direct to long-term investing — the choice of *what* to invest in is best made with a registered adviser.` };
  }
  for (const [k, v] of Object.entries(CONCEPTS)) if (lower.includes(k.split(' ')[0])) return { text: v };
  if (/last month|this month/.test(lower)) {
    const mk = monthKey(new Date());
    const spend = txs.filter((t) => monthKey(t.date) === mk && t.amount < 0).reduce((a, t) => a - t.amount, 0);
    return { text: `So far in ${monthLabel(mk, true)} you've spent ${money(spend)}. Open the Monthly Review for a full breakdown.` };
  }
  return { text: `I can model scenarios and explain concepts. Try:\n• "What if I cut dining by 30%?"\n• "What if my rent goes up by 3000?"\n• "What if my salary goes up 10%?"\n• "How am I doing?"\n• "Where does my money go?"\n• "Explain emergency fund"` };
}

function matchCategory(s) {
  s = s.trim().toLowerCase();
  const alias = { 'eating out': 'Dining', 'dining out': 'Dining', food: 'Dining', restaurants: 'Dining', takeout: 'Dining', groceries: 'Groceries', shopping: 'Shopping', travel: 'Travel', cabs: 'Transport', uber: 'Transport', transport: 'Transport', subscriptions: 'Subscriptions', entertainment: 'Entertainment', movies: 'Entertainment' };
  if (alias[s]) return alias[s];
  return CATEGORIES.find((c) => s.includes(c.id.toLowerCase()) || c.id.toLowerCase().includes(s))?.id;
}

function goalDiff(a, b) {
  const lines = b.goals.map((g, i) => {
    const o = a.goals[i];
    if (!o) return '';
    const fmt = (d) => (d ? monthLabel(monthKey(d), true) : 'beyond 7 yrs');
    if (o.doneDate === g.doneDate) return `• ${g.name}: unchanged (${fmt(g.doneDate)})`;
    return `• ${g.name}: ${fmt(o.doneDate)} → ${fmt(g.doneDate)}`;
  }).filter(Boolean);
  return lines.length ? `\nGoal dates:\n${lines.join('\n')}` : '';
}
