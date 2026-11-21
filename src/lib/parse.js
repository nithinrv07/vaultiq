// Ingestion of messy statements: CSV, PDF (text layer) and transaction SMS.
import { hashId, ymd } from './format.js';

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

/** Parse many date shapes. `order` is 'dmy' or 'mdy' for ambiguous numeric dates. */
export function parseDate(raw, order = 'dmy') {
  if (!raw) return null;
  const s = String(raw).trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return mk(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    if (order === 'mdy' && a <= 12) [a, b] = [b, a];
    if (b > 12 && a <= 12) [a, b] = [b, a];
    return mk(y, b - 1, a);
  }
  if ((m = s.match(/^(\d{1,2})[-\s/]?([a-z]{3,9})[-\s/,]*(\d{2,4})/i))) {
    const mo = MONTHS[m[2].toLowerCase().slice(0, m[2].length > 3 && m[2].toLowerCase().startsWith('sept') ? 4 : 3)];
    if (mo !== undefined) { let y = +m[3]; if (y < 100) y += 2000; return mk(y, mo, +m[1]); }
  }
  if ((m = s.match(/^([a-z]{3,9})\s+(\d{1,2})\s+(\d{4})/i))) {
    const mo = MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (mo !== undefined) return mk(+m[3], mo, +m[2]);
  }
  return null;
}
function mk(y, mo, d) {
  const dt = new Date(y, mo, d);
  if (isNaN(dt) || dt.getMonth() !== mo || y < 1990 || y > 2100) return null;
  return ymd(dt);
}

function detectDateOrder(samples) {
  let dmy = 0, mdy = 0;
  for (const s of samples) {
    const m = String(s).match(/^(\d{1,2})[-/.](\d{1,2})[-/.]/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? 'mdy' : 'dmy';
}

export function parseAmount(raw) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim();
  if (!s || s === '-' ) return null;
  let neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /\bdr\b/i.test(s) || /-$/.test(s);
  const pos = /\bcr\b/i.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;
  // Handle European "1.234,56"
  if (/\d\.\d{3},\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  if (pos) neg = false;
  return neg ? -n : n;
}

/* ---------------- CSV ---------------- */
function splitCSV(text) {
  const firstLines = text.split(/\r?\n/).slice(0, 10).join('\n');
  const delims = [',', ';', '\t', '|'];
  const delim = delims.map((d) => [d, firstLines.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
}

const H = {
  date: /^(txn |transaction |value |posting |post )?date|^date/i,
  desc: /desc|narration|particular|details|remarks|merchant|payee|memo|name/i,
  debit: /debit|withdrawal|dr\b|paid out|money out|spent/i,
  credit: /credit|deposit|cr\b|paid in|money in|received/i,
  amount: /^amount|amount$|amt|value$|inr|transaction amount/i,
  type: /^type$|dr\/cr|cr\/dr|txn type|transaction type/i,
  balance: /balance|bal\b/i,
};

export function parseCSV(text) {
  const rows = splitCSV(text);
  // Find header row: first row (within 25) whose cells match a date + (amount or debit) column.
  let hi = -1, cols = null;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const c = mapHeaders(rows[i]);
    if (c.date >= 0 && (c.amount >= 0 || c.debit >= 0 || c.credit >= 0)) { hi = i; cols = c; break; }
  }
  const warnings = [];
  if (hi < 0) {
    // headerless: guess date col = first parseable date, amount = last numeric col, desc = longest text col
    hi = -1; cols = guessColumns(rows);
    warnings.push('No header row found — columns were inferred.');
  }
  const body = rows.slice(hi + 1);
  const order = detectDateOrder(body.map((r) => r[cols.date]));
  const out = [];
  for (const r of body) {
    const date = parseDate(r[cols.date], order);
    if (!date) continue;
    let amount = null;
    if (cols.debit >= 0 || cols.credit >= 0) {
      const d = cols.debit >= 0 ? parseAmount(r[cols.debit]) : null;
      const c = cols.credit >= 0 ? parseAmount(r[cols.credit]) : null;
      if (d) amount = -Math.abs(d);
      else if (c) amount = Math.abs(c);
    }
    if (amount === null && cols.amount >= 0) {
      amount = parseAmount(r[cols.amount]);
      if (amount !== null && cols.type >= 0) {
        const t = (r[cols.type] || '').toLowerCase();
        if (/^d|debit|withdraw/.test(t)) amount = -Math.abs(amount);
        else if (/^c|credit|deposit/.test(t)) amount = Math.abs(amount);
      }
    }
    if (amount === null || amount === 0) continue;
    const description = cols.desc >= 0 ? r[cols.desc] : r.filter((_, i) => ![cols.date, cols.amount, cols.debit, cols.credit, cols.balance].includes(i)).join(' ');
    out.push(makeTx(date, description, amount, 'csv'));
  }
  return { transactions: out, warnings };
}

function mapHeaders(row) {
  const find = (re, not = []) => row.findIndex((h, i) => re.test(h) && !not.includes(i));
  const c = { date: find(H.date) };
  c.debit = find(H.debit);
  c.credit = find(H.credit, [c.debit]);
  c.type = find(H.type);
  c.balance = find(H.balance);
  c.amount = row.findIndex((h, i) => H.amount.test(h) && ![c.debit, c.credit, c.balance].includes(i));
  c.desc = find(H.desc, [c.date]);
  if (c.debit >= 0 && c.debit === c.type) c.debit = -1;
  return c;
}

function guessColumns(rows) {
  const sample = rows.slice(0, 20);
  const n = Math.max(...sample.map((r) => r.length));
  const score = (fn) => [...Array(n).keys()].map((i) => sample.filter((r) => fn(r[i])).length);
  const dateS = score((v) => !!parseDate(v));
  const numS = score((v) => v && /^[-(]?[\d,.\s₹$€£]+\)?\s*(cr|dr)?$/i.test(v));
  const txtS = [...Array(n).keys()].map((i) => sample.reduce((a, r) => a + ((r[i] || '').replace(/[\d\s.,-]/g, '').length), 0));
  const date = dateS.indexOf(Math.max(...dateS));
  const numCols = numS.map((s, i) => [s, i]).filter(([s, i]) => s > sample.length / 2 && i !== date).map(([, i]) => i);
  const desc = txtS.map((s, i) => [s, i]).filter(([, i]) => i !== date && !numCols.includes(i)).sort((a, b) => b[0] - a[0])[0]?.[1] ?? -1;
  return { date, desc, amount: numCols[0] ?? -1, debit: -1, credit: -1, type: -1, balance: numCols.length > 1 ? numCols[numCols.length - 1] : -1 };
}

/* ---------------- Statement text lines (PDF / pasted) ---------------- */
const DATE_AT_START = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-\s][A-Za-z]{3,4}[-\s,]+\d{2,4}|[A-Za-z]{3}\s\d{1,2},?\s\d{4})/;
const AMOUNT_RE = /(?<![\w/])-?\(?(?:₹|rs\.?|inr|\$|€|£)?\s?\d{1,3}(?:,\d{2,3})*(?:\.\d{2})\)?(?:\s?(?:cr|dr))?(?![\w/])/gi;

export function parseStatementLines(lines, source = 'pdf') {
  const order = detectDateOrder(lines.map((l) => (l.match(DATE_AT_START) || [])[0]).filter(Boolean));
  const out = [];
  let prevBal = null;
  let pending = null; // for multi-line descriptions
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const dm = line.match(DATE_AT_START);
    if (!dm) {
      if (pending && line && !AMOUNT_RE.test(line) && line.length < 80) pending.description += ' ' + line;
      AMOUNT_RE.lastIndex = 0;
      if (/opening balance|balance b\/?f|brought forward/i.test(line)) {
        const a = line.match(AMOUNT_RE); if (a) prevBal = parseAmount(a[a.length - 1]);
      }
      continue;
    }
    const date = parseDate(dm[0], order);
    if (!date) continue;
    let rest = line.slice(dm[0].length).trim();
    // drop a second (value) date
    const second = rest.match(DATE_AT_START);
    if (second) rest = rest.slice(second[0].length).trim();
    const amounts = [...rest.matchAll(AMOUNT_RE)].map((m) => ({ raw: m[0], idx: m.index }));
    if (!amounts.length) continue;
    const descEnd = amounts[0].idx;
    let description = rest.slice(0, descEnd).replace(/\s{2,}/g, ' ').trim() || 'Transaction';
    let amount;
    const txRaw = amounts.length >= 2 ? amounts[amounts.length - 2].raw : amounts[0].raw;
    const balance = amounts.length >= 2 ? parseAmount(amounts[amounts.length - 1].raw) : null;
    amount = Math.abs(parseAmount(txRaw));
    if (/\bcr\b/i.test(txRaw)) amount = amount;
    else if (/\bdr\b/i.test(txRaw) || /^-|\(/.test(txRaw.trim())) amount = -amount;
    else if (prevBal !== null && balance !== null) amount = balance >= prevBal ? amount : -amount;
    else if (/salary|credit|refund|received|deposit|interest|by transfer|\bcr\b/i.test(rest)) amount = amount;
    else amount = -amount;
    if (balance !== null) prevBal = balance;
    if (!amount) continue;
    pending = makeTx(date, description, amount, source);
    out.push(pending);
  }
  return { transactions: out, warnings: out.length ? [] : ['No transaction rows recognised in this document.'] };
}

export async function parsePDF(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = new Map();
    for (const it of tc.items) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], s: it.str });
    }
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
      lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join('  '));
    });
  }
  const res = parseStatementLines(lines, 'pdf');
  if (!lines.length) res.warnings = ['This PDF has no text layer (it may be a scanned image).'];
  return res;
}

/* ---------------- SMS ---------------- */
const SMS_AMT = /(?:rs\.?|inr|₹|usd|\$)\s*([\d,]+(?:\.\d{1,2})?)/i;
const DEBIT_WORDS = /\b(debited|spent|paid|sent|withdrawn|purchase|deducted|dr\b|debit|txn of|used)\b/i;
const CREDIT_WORDS = /\b(credited|received|deposited|refunded|cr\b|credit of)\b/i;

export function parseSMS(text, fallbackDate = new Date()) {
  // Messages separated by blank lines, or one per line if no blank lines exist.
  const chunks = /\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split(/\n/);
  const out = [];
  const skipped = [];
  for (const raw of chunks) {
    const msg = raw.replace(/\s+/g, ' ').trim();
    if (!msg) continue;
    if (/\b(otp|one time password|verification code)\b/i.test(msg)) { skipped.push(msg); continue; }
    const am = msg.match(SMS_AMT);
    if (!am) { skipped.push(msg); continue; }
    const isCredit = CREDIT_WORDS.test(msg) && !(DEBIT_WORDS.test(msg) && msg.search(DEBIT_WORDS) < msg.search(CREDIT_WORDS));
    const isDebit = DEBIT_WORDS.test(msg);
    if (!isCredit && !isDebit) { skipped.push(msg); continue; }
    const amount = parseFloat(am[1].replace(/,/g, '')) * (isCredit ? 1 : -1);
    const dm = msg.match(/(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4})|(\d{4}-\d{2}-\d{2})|(\d{1,2}\s?[A-Za-z]{3}\s?\d{2,4})/);
    const date = (dm && parseDate(dm[0].replace(/(\d)([A-Za-z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2'))) || ymd(fallbackDate);
    const merch =
      msg.match(/\b(?:at|to|towards|for)\s+(?:vpa\s+)?([A-Za-z0-9@&._*' -]{2,40}?)(?=\s+(?:on|ref|upi|via|avl|avbl|bal|using|from|is|\.|for)\b|\s*[.;,(]|$)/i) ||
      msg.match(/\binfo[:\s]+([A-Za-z0-9@&._*' -]{2,40}?)(?=[.;,]|\s+avl|$)/i) ||
      msg.match(/\bfrom\s+(?:vpa\s+)?([A-Za-z0-9@&._*' -]{2,40}?)(?=\s+(?:on|ref|upi|via|avl)\b|[.;,]|$)/i);
    let description = merch ? merch[1].trim() : (isCredit ? 'Credit (SMS)' : 'Debit (SMS)');
    if (/^a\/?c\b|^your\b|^xx/i.test(description)) description = isCredit ? 'Credit (SMS)' : 'Debit (SMS)';
    out.push(makeTx(date, description, amount, 'sms'));
  }
  return { transactions: out, warnings: skipped.length ? [`${skipped.length} message(s) skipped (OTP, promo or no amount).`] : [] };
}

function makeTx(date, description, amount, source) {
  amount = Math.round(amount * 100) / 100;
  description = String(description).replace(/\s+/g, ' ').trim().slice(0, 120);
  return { id: hashId(`${date}|${amount}|${description.toLowerCase()}`), date, description, amount, source };
}

export async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return parsePDF(file);
  const text = await file.text();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || /,|;|\t/.test(text.split('\n')[0] || '')) {
    const r = parseCSV(text);
    if (r.transactions.length) return r;
  }
  const sms = parseSMS(text);
  if (sms.transactions.length) return sms;
  return parseStatementLines(text.split(/\r?\n/), 'text');
}

export function parseText(text) {
  const looksSMS = /(debited|credited|spent|a\/c|avl bal|upi)/i.test(text) && !/^.*(date|narration).*$/im.test(text.split('\n')[0]);
  if (looksSMS) { const r = parseSMS(text); if (r.transactions.length) return r; }
  const csv = parseCSV(text);
  if (csv.transactions.length) return csv;
  return parseStatementLines(text.split(/\r?\n/), 'text');
}
