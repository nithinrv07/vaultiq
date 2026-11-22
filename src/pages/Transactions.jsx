import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { CatSelect, Empty, Icon, PageHead, Reveal, CatPill } from '../components/ui.jsx';
import { CATEGORIES, merchantKey } from '../lib/categories.js';
import { longDate, money, monthKey, monthLabel } from '../lib/format.js';

export default function Transactions({ go, toast, params = {} }) {
  const { txs, rules, correct, deleteRule, deleteTx, ruleLog } = useStore();
  const [q, setQ] = useState(params.q || '');
  const [cat, setCat] = useState(params.cat || '');
  const [month, setMonth] = useState('');
  const [pending, setPending] = useState(null); // { tx, category, matches }
  const [limit, setLimit] = useState(60);

  const months = useMemo(() => [...new Set(txs.map((t) => monthKey(t.date)))].sort().reverse(), [txs]);
  const list = useMemo(() => txs.filter((t) =>
    (!q || t.description.toLowerCase().includes(q.toLowerCase())) && (!cat || t.category === cat) && (!month || monthKey(t.date) === month)), [txs, q, cat, month]);
  const totals = list.reduce((a, t) => { t.amount < 0 ? (a.out += -t.amount) : (a.in += t.amount); return a; }, { in: 0, out: 0 });

  function onChange(tx, category) {
    const key = merchantKey(tx.description);
    const matches = txs.filter((t) => t.id !== tx.id && merchantKey(t.description) === key && t.category !== category && !t.manual);
    setPending({ tx, category, key, matches });
  }
  function apply(learn) {
    correct(pending.tx.id, pending.category, { learn });
    toast(learn
      ? { title: `Learned: “${pending.key}” → ${pending.category}`, body: `${pending.matches.length} past transaction(s) updated. Future imports will follow this rule.` }
      : { title: 'Updated just this one', body: 'No rule was created.' });
    setPending(null);
  }

  if (!txs.length) return (<><PageHead eyebrow="My spending" title="My spending" /><Empty title="Nothing here yet" body="Import a statement to see and correct transactions." action={<button className="btn btn-primary" onClick={() => go('import')}>Import</button>} /></>);

  return (
    <>
      <PageHead eyebrow="My spending" title={<>Every rupee, <em>explained</em>.</>} sub="Wrong category? Tap it and pick the right one. Zvault will remember for next time." />

      <Reveal className="card toolbar">
        <label className="search"><Icon name="search" size={16} /><input placeholder="Search merchant or description" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.id}>{c.id}</option>)}</select>
        <select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">All months</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}</select>
        <span className="muted small grow r">{list.length} rows · <span className="pos">+{money(totals.in)}</span> · <span className="neg">−{money(totals.out)}</span></span>
      </Reveal>

      <section className="grid-3-1">
        <Reveal className="card flush">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="r">Amount</th><th /></tr></thead>
              <tbody>
                {list.slice(0, limit).map((t) => (
                  <tr key={t.id} className={pending?.tx.id === t.id ? 'is-active' : ''}>
                    <td className="nowrap muted">{longDate(t.date)}</td>
                    <td><div className="desc">{t.description}</div><span className="src">{t.via === 'rule' ? '✦ learned rule' : t.via === 'manual' ? '✎ you set this' : `auto · ${t.source || ''}`}</span></td>
                    <td><CatSelect value={t.category} onChange={(c) => onChange(t, c)} /></td>
                    <td className={`r num ${t.amount > 0 ? 'pos' : ''}`}>{money(t.amount, { decimals: 2, sign: t.amount > 0 })}</td>
                    <td><button className="icon-btn" title="Delete" onClick={() => deleteTx(t.id)}><Icon name="x" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length > limit && <div className="center pad"><button className="btn" onClick={() => setLimit(limit + 100)}>Show more ({list.length - limit} left)</button></div>}
        </Reveal>

        <Reveal className="card sticky" delay={100}>
          <div className="card-head"><h3><Icon name="brain" /> Things Zvault remembers</h3><span className="badge">{rules.length}</span></div>
          {rules.length ? (
            <ul className="rules">
              {rules.map((r) => (
                <li key={r.id}>
                  <div><code>{r.pattern}</code><Icon name="arrow" size={13} /><CatPill cat={r.category} small /></div>
                  <button className="icon-btn" onClick={() => deleteRule(r.id)} title="Forget rule"><Icon name="trash" size={14} /></button>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Fix a category in the list and Zvault will remember it for that shop.</p>}
          {!!ruleLog?.length && <p className="muted small">Last: {ruleLog[0].key} → {ruleLog[0].category} ({ruleLog[0].affected} updated)</p>}
        </Reveal>
      </section>

      {pending && (
        <div className="modal-bg" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">Remember this?</span>
            <h3>Always file <code>{pending.key}</code> as <CatPill cat={pending.category} />?</h3>
            <p className="muted">Zvault will put this shop in the same category from now on. {pending.matches.length ? `${pending.matches.length} other transaction(s) will be re-categorised too:` : 'No other past transactions match yet — future ones will.'}</p>
            {!!pending.matches.length && (
              <ul className="match-list">{pending.matches.slice(0, 5).map((m) => <li key={m.id}><span>{longDate(m.date)} · {m.description}</span><span className="muted">{m.category} → <b>{pending.category}</b></span></li>)}{pending.matches.length > 5 && <li className="muted">…and {pending.matches.length - 5} more</li>}</ul>
            )}
            <div className="row gap end">
              <button className="btn" onClick={() => apply(false)}>Just this once</button>
              <button className="btn btn-primary" onClick={() => apply(true)}><Icon name="brain" size={16} />Yes, always</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
