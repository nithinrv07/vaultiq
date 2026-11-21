// Deterministic demo data: ~6 months of realistic transactions ending today,
// plus sample raw CSV and SMS so the importer can be tried immediately.
import { addDays, addMonths, hashId, ymd, uid } from './format.js';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export function sampleTransactions(today = new Date()) {
  const r = rng(42);
  const out = [];
  const push = (d, desc, amt, src = 'csv') => {
    if (d > today) return;
    const date = ymd(d);
    out.push({ id: hashId(`${date}|${amt}|${desc}|${out.length}`), date, description: desc, amount: Math.round(amt * 100) / 100, source: src });
  };
  const start = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -5);
  for (let mi = 0; mi < 6; mi++) {
    const m0 = addMonths(start, mi);
    const at = (day) => new Date(m0.getFullYear(), m0.getMonth(), day);
    push(at(1), 'NEFT CR SALARY ACME TECHNOLOGIES PVT LTD', 95000);
    push(at(3), 'UPI/RENT/landlord.kumar@okhdfc/Rent Nov', -24000);
    push(at(5), 'BILLDESK TNEB ELECTRICITY', -(1450 + Math.round(r() * 900)));
    push(at(6), 'ACH D JIO FIBER BROADBAND', -999);
    push(at(7), 'NACH SIP GROWW MUTUAL FUND', -10000);
    push(at(9), 'POS NETFLIX.COM', mi >= 4 ? -649 : -499);
    push(at(12), 'UPI SPOTIFY INDIA', -119);
    push(at(14), 'CULT.FIT MEMBERSHIP', -1500);
    if (mi % 3 === 0) push(at(18), 'LIC PREMIUM ONLINE', -4200);
    push(at(21), 'APPLE.COM/BILL ICLOUD', -75);
    if (mi < 5) push(at(24), 'AMAZON PRIME MEMBERSHIP', mi % 6 === 0 ? -1499 : 0);
    // variable spending
    const dim = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const day = at(d);
      if (r() < 0.38) push(day, ['UPI/SWIGGY/swiggy@icici', 'ZOMATO ORDER UPI', 'STARBUCKS COFFEE', 'UPI/CHAI POINT', 'DOMINOS PIZZA'][Math.floor(r() * 5)], -(150 + Math.round(r() * (mi >= 4 ? 900 : 600))));
      if (r() < 0.22) push(day, ['BIGBASKET', 'BLINKIT UPI', 'ZEPTO MARKETPLACE', 'DMART AVENUE'][Math.floor(r() * 4)], -(300 + Math.round(r() * 1600)));
      if (r() < 0.25) push(day, ['UBER INDIA TRIP', 'OLA CABS', 'RAPIDO BIKE', 'CHENNAI METRO RAIL'][Math.floor(r() * 4)], -(60 + Math.round(r() * 380)));
      if (r() < 0.07) push(day, ['AMAZON SELLER SERVICES', 'FLIPKART INTERNET', 'MYNTRA DESIGNS', 'DECATHLON SPORTS'][Math.floor(r() * 4)], -(500 + Math.round(r() * 3500)));
      if (r() < 0.04) push(day, ['APOLLO PHARMACY', 'MEDPLUS', 'PRACTO CONSULT'][Math.floor(r() * 3)], -(200 + Math.round(r() * 900)));
      if (r() < 0.04) push(day, ['BOOKMYSHOW', 'PVR CINEMAS'][Math.floor(r() * 2)], -(350 + Math.round(r() * 700)));
      if (r() < 0.02) push(day, 'ATM CASH WDL', -2000);
    }
    if (mi === 2) push(at(16), 'MAKEMYTRIP FLIGHT BOOKING', -8600);
    if (mi === 3) push(at(10), 'FREELANCE PAYMENT UPI', 12000);
    push(at(28), 'URBAN COMPANY SALON', -(r() < 0.5 ? 0 : 699));
  }
  return out.filter((t) => t.amount !== 0);
}

export function sampleProfile() {
  const t = new Date();
  return {
    name: 'Alex',
    currency: 'INR',
    monthlyIncome: 95000,
    fixedCosts: [
      { id: uid(), name: 'Rent', amount: 24000, category: 'Housing' },
      { id: uid(), name: 'Electricity', amount: 1900, category: 'Utilities' },
      { id: uid(), name: 'Broadband', amount: 999, category: 'Utilities' },
      { id: uid(), name: 'Life insurance (avg)', amount: 1400, category: 'Insurance' },
    ],
    emergencyFund: { current: 120000, targetMonths: 6 },
    goals: [
      { id: uid(), name: 'Laptop upgrade', target: 120000, saved: 30000, date: ymd(addMonths(t, 8)) },
      { id: uid(), name: 'Goa trip', target: 45000, saved: 5000, date: ymd(addMonths(t, 4)) },
      { id: uid(), name: 'Home down payment', target: 1200000, saved: 150000, date: ymd(addMonths(t, 48)) },
    ],
    budgets: {},
  };
}

export const SAMPLE_SMS = `Rs.450.00 debited from A/c XX4821 on ${dd(-1)} to VPA swiggy@icici (UPI Ref 431298765432). Not you? Call 1800-xxx

INR 1,299.00 spent on HDFC Bank Card XX9912 at AMAZON PRIME on ${dd(-2)}. Avl Lmt: INR 82,301.

Your A/c XX4821 is credited with Rs 2,500.00 on ${dd(-3)} from VPA rahul.s@oksbi. Avl Bal Rs 48,210.

Dear Customer, Rs.230 paid to UBER INDIA on ${dd(-3)} via UPI. Ref 9921.

Your OTP for login is 482910. Do not share it with anyone.

Rs 3,450.00 withdrawn at ATM on ${dd(-4)}. Avl Bal: Rs 44,760.`;

export const SAMPLE_CSV = `Bank of Example — Statement
Account: XXXX4821
Txn Date,Value Date,Narration,Ref No,Withdrawal Amt,Deposit Amt,Closing Balance
${dd(-6, '/')},${dd(-6, '/')},UPI/ZOMATO/zomato@hdfcbank/Food,431200001,"612.00",,"51,210.40"
${dd(-5, '/')},${dd(-5, '/')},POS BIGBASKET CHENNAI,431200002,"1,845.50",,"49,364.90"
${dd(-5, '/')},${dd(-5, '/')},IMPS FROM PRIYA REFUND DINNER,431200003,,"800.00","50,164.90"
${dd(-4, '/')},${dd(-4, '/')},ACH D HOTSTAR SUBSCRIPTION,431200004,"299.00",,"49,865.90"
${dd(-3, '/')},${dd(-3, '/')},UPI/RAPIDO/rapido@ybl/ride,431200005,"89.00",,"49,776.90"`;

function dd(off, sep = '-') {
  const d = addDays(new Date(), off);
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join(sep);
}
