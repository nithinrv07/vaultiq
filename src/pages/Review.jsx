import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { Donut, Meter } from '../components/Charts.jsx';
import { CatPill, CountUp, Empty, Icon, PageHead, Reveal } from '../components/ui.jsx';
import { catColor } from '../lib/categories.js';
import { money, monthKey, monthLabel } from '../lib/format.js';
import { monthlyReview, simulate } from '../lib/model.js';

export default function Review({ go }) {
  const { txs, profile, base, recurring } = useStore();
  const months = useMemo(() => [...new Set(txs.map((t) => monthKey(t.date)))].sort().reverse(), [txs]);
  const cur = monthKey(new Date());
  const [month, setMonth] = useState(months.find((m) => m < cur) || months[0]);
  if (!txs.length) return (<><PageHead eyebrow="Monthly review" title="Your month, in review" /><Empty title="No months to review" body="Import transactions first." action={<button className="btn btn-primary" onClick={() => go('import')}>Import</button>} /></>);
  const r = monthlyReview({ txs, month, profile, base, recurring });
  const sim = simulate(profile, base);
  const rate = r.cur.income ? r.net / r.cur.income : 0;
  const grade = rate >= 0.3 ? ['Thriving', 'var(--forest)'] : rate >= 0.15 ? ['Steady', 'var(--gold)'] : rate >= 0 ? ['Tight', 'var(--coral)'] : ['Overspent', 'var(--coral)'];

  return (
    <div className="review">
      <PageHead eyebrow="Monthly review" title={<>{monthLabel(month, true).split(' ')[0]}, <em>in review</em>.</>}
        sub={`${r.count} transactions · ${month === cur ? 'month in progress' : 'complete month'}`}
        right={<div className="row gap no-print">
          <select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}</select>
          <button className="btn" onClick={() => window.print()}><Icon name="print" size={16} />Print / PDF</button>
        </div>} />

      <Reveal className="card review-hero">
        <div className="review-grade" style={{ '--g': grade[1] }}><span className="eyebrow">This month was</span><strong>{grade[0]}</strong><span className="muted">kept {(rate * 100).toFixed(0)}% of income</span></div>
        <div className="review-nums">
          <div><span className="eyebrow">Money in</span><b className="num"><CountUp value={r.cur.income} /></b></div>
          <div><span className="eyebrow">Money out</span><b className="num"><CountUp value={r.cur.spend} /></b></div>
          <div><span className="eyebrow">Net</span><b className={`num ${r.net >= 0 ? 'pos' : 'neg'}`}><CountUp value={r.net} /></b></div>
          <div><span className="eyebrow">Invested / saved</span><b className="num"><CountUp value={r.cur.saved} /></b></div>
        </div>
      </Reveal>

      <Reveal className="card insights">
        <h3><Icon name="spark" /> What stood out</h3>
        <ol>{r.insights.map((i, k) => <li key={k}>{i}</li>)}</ol>
      </Reveal>

      <section className="grid-1-1">
        <Reveal className="card">
          <div className="card-head"><h3>By category</h3><span className="muted small">vs plan · vs last month</span></div>
          <ul className="review-cats">
            {r.cats.map((c) => (
              <li key={c.cat}>
                <div className="row between"><CatPill cat={c.cat} small /><span className="small"><b>{money(c.amount)}</b>{c.prev ? <span className={c.amount > c.prev ? 'neg' : 'pos'}> {c.amount > c.prev ? '▲' : '▼'} {money(Math.abs(c.amount - c.prev))}</span> : null}</span></div>
                {c.budget ? <Meter value={c.amount} max={c.budget} color={catColor(c.cat)} /> : null}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="stack">
          <Reveal className="card center-content">
            <Donut size={200} data={r.cats.filter((c) => c.amount > 0).map((c) => ({ label: c.cat, value: c.amount, color: catColor(c.cat) }))} center={<><span className="eyebrow">Spent</span><strong>{money(r.cur.spend, { compact: true })}</strong></>} />
          </Reveal>
          <Reveal className="card">
            <h3>Top merchants</h3>
            <ul className="merchants">{r.merchants.map((m, i) => <li key={m.name}><span className="rank">{i + 1}</span><span className="grow">{m.name}<span className="muted small"> · {m.count}×</span></span><b className="num">{money(m.total)}</b></li>)}</ul>
          </Reveal>
        </div>
      </section>

      <section className="grid-1-1">
        <Reveal className="card">
          <h3>Subscriptions charged</h3>
          <p className="muted small">{r.subs.length} recurring payments · {money(r.subsTotal)} this month</p>
          <ul className="merchants">{r.subs.map((s) => <li key={s.key}><span className="grow">{s.name}{s.alerts.length ? <span className="tag tag-warn">{s.alerts[0].type.replace('-', ' ')}</span> : null}</span><b className="num">{money(s.history.find((h) => monthKey(h.date) === month)?.amount)}</b></li>)}</ul>
        </Reveal>
        <Reveal className="card">
          <h3>Goals checkpoint</h3>
          <ul className="merchants">{sim.goals.map((g) => <li key={g.id}><span className="grow">{g.name}</span><span className={`tag ${g.onTrack ? 'tag-ok' : 'tag-warn'}`}>{g.onTrack ? 'On track' : 'Behind'}</span></li>)}</ul>
          <p className="muted small">Emergency fund: {money(profile.emergencyFund.current)} of {money(sim.efTarget)} ({Math.round((profile.emergencyFund.current / Math.max(1, sim.efTarget)) * 100)}%).</p>
          <button className="btn btn-s no-print" onClick={() => go('planner')}>Plan next month <Icon name="arrow" size={14} /></button>
        </Reveal>
      </section>
      <p className="disclaimer"><Icon name="shield" size={14} /> Educational summary of your own data. Not financial, tax or investment advice.</p>
    </div>
  );
}
