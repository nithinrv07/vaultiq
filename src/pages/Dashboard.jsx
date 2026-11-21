import { useStore } from '../store.jsx';
import { CashflowBars, Donut, Meter, Ring } from '../components/Charts.jsx';
import { CatPill, CountUp, Empty, Icon, PageHead, Reveal } from '../components/ui.jsx';
import { catColor } from '../lib/categories.js';
import { longDate, money, monthKey, monthLabel, shortDate, daysBetween } from '../lib/format.js';
import { effectiveBudgets, monthlyStats, simulate } from '../lib/model.js';

export default function Dashboard({ go }) {
  const { txs, profile, base, nudges, recurring, loadDemo } = useStore();
  if (!txs.length && !profile.monthlyIncome) {
    return (
      <>
        <PageHead eyebrow="Welcome" title={<>Let's grow your <em>money model</em>.</>} sub="Import a statement, paste bank SMS, or explore with a realistic demo dataset." />
        <Empty title="No data yet" body="Your dashboard comes alive once there are transactions to learn from."
          action={<div className="row gap"><button className="btn btn-primary" onClick={loadDemo}><Icon name="spark" />Load demo data</button><button className="btn" onClick={() => go('import')}><Icon name="upload" />Import statement</button></div>} />
      </>
    );
  }
  const stats = monthlyStats(txs);
  const mk = monthKey(new Date());
  const cur = stats.find((s) => s.month === mk) || { income: 0, spend: 0, byCat: {} };
  const sim = simulate(profile, base);
  const efMonths = (+profile.emergencyFund.current || 0) / Math.max(1, sim.essentials);
  const budgets = effectiveBudgets(profile, base);
  const donut = Object.entries(cur.byCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: c, value: v, color: catColor(c) }));
  const upcoming = recurring.filter((r) => r.status !== 'cancel').map((r) => ({ ...r, inDays: daysBetween(new Date(), r.nextDate) })).filter((r) => r.inDays >= -2 && r.inDays <= 30).sort((a, b) => a.inDays - b.inDays).slice(0, 5);
  const day = new Date().getDate();
  const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  return (
    <>
      <PageHead eyebrow={monthLabel(mk, true)} title={<>Good {greeting()}{profile.name ? `, ${profile.name}` : ''}.</>}
        sub={sim.surplus >= 0 ? <>Your model shows <b>{money(sim.surplus)}</b> of breathing room each month — a {(sim.savingsRate * 100).toFixed(0)}% savings rate.</> : <>Your model is running a <b>{money(-sim.surplus)}</b> monthly gap. Let's find it.</>}
        right={<button className="btn btn-primary" onClick={() => go('planner')}><Icon name="sliders" />Run a what-if</button>} />

      <section className="kpis">
        {[
          { label: 'Spent this month', value: cur.spend, foot: `Day ${day} of ${dim} · plan ${money(Object.values(budgets).reduce((a, b) => a + b, 0) + sim.fixed, { compact: true })}` },
          { label: 'Income this month', value: cur.income, foot: `Model assumes ${money(sim.income)}/mo` },
          { label: 'Monthly surplus', value: sim.surplus, foot: `${(sim.savingsRate * 100).toFixed(0)}% of income`, accent: true },
          { label: 'Emergency cushion', value: efMonths, fmt: (v) => `${v.toFixed(1)} mo`, foot: `Target ${profile.emergencyFund.targetMonths} months of essentials` },
        ].map((k, i) => (
          <Reveal key={k.label} delay={i * 80} className={`card kpi ${k.accent ? 'kpi-accent' : ''}`}>
            <span className="eyebrow">{k.label}</span>
            <strong className="kpi-v"><CountUp value={k.value} format={k.fmt || ((v) => money(v))} /></strong>
            <span className="muted small">{k.foot}</span>
          </Reveal>
        ))}
      </section>

      <section className="grid-2-1">
        <Reveal className="card">
          <div className="card-head"><h3>Cash flow</h3><div className="legend"><span><i style={{ background: 'var(--forest)' }} />In</span><span><i style={{ background: 'var(--coral)' }} />Out</span></div></div>
          <CashflowBars height={280} data={stats.slice(-6).map((s) => ({ label: monthLabel(s.month), income: s.income, spend: s.spend }))} />
        </Reveal>
        <Reveal className="card" delay={100}>
          <div className="card-head"><h3>Where it went</h3><span className="muted small">{monthLabel(mk)}</span></div>
          <div className="donut-row">
            <Donut data={donut} size={180} center={<><span className="eyebrow">Spent</span><strong>{money(cur.spend, { compact: true })}</strong></>} />
            <ul className="mini-legend">
              {donut.slice(0, 6).map((d) => <li key={d.label}><i style={{ background: d.color }} />{d.label}<span>{money(d.value, { compact: true })}</span></li>)}
            </ul>
          </div>
        </Reveal>
      </section>

      <section className="grid-1-1">
        <Reveal className="card">
          <div className="card-head"><h3><Icon name="bell" /> Nudges</h3><span className="badge">{nudges.length}</span></div>
          {nudges.length ? (
            <ul className="nudges">
              {nudges.slice(0, 5).map((n, i) => (
                <li key={i} className={`nudge nudge-${n.level}`}>
                  <span className="nudge-dot" />
                  <div>
                    <b>{n.title}</b>
                    <p>{n.body}</p>
                    {n.action && <button className="link" onClick={() => go(n.action.to, n.action)}>{n.action.label} <Icon name="arrow" size={14} /></button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="muted">All quiet — spending is tracking your plan.</p>}
        </Reveal>
        <Reveal className="card" delay={100}>
          <div className="card-head"><h3>Budget pace</h3><button className="link" onClick={() => go('profile')}>Edit plan</button></div>
          <ul className="budget-list">
            {Object.entries(budgets).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([c, b]) => {
              const s = cur.byCat[c] || 0;
              return (
                <li key={c}>
                  <div className="row between"><CatPill cat={c} small /><span className="small"><b>{money(s)}</b> <span className="muted">/ {money(b)}</span></span></div>
                  <Meter value={s} max={b} color={catColor(c)} />
                  <span className="pace" style={{ left: `${(day / dim) * 100}%` }} title="Where you'd be at an even pace" />
                </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      <section className="grid-1-1">
        <Reveal className="card">
          <div className="card-head"><h3><Icon name="target" /> Goals</h3><button className="link" onClick={() => go('profile')}>Manage</button></div>
          {sim.goals.length ? (
            <div className="goal-rings">
              {sim.goals.map((g) => {
                const orig = profile.goals.find((x) => x.id === g.id);
                return (
                  <div key={g.id} className="goal-ring">
                    <Ring value={(+orig.saved || 0) / (+g.target || 1)} size={76} color={g.onTrack ? 'var(--forest)' : 'var(--coral)'}><b>{Math.round(((+orig.saved || 0) / (+g.target || 1)) * 100)}%</b></Ring>
                    <div><b>{g.name}</b><span className="muted small">{money(orig.saved)} of {money(g.target)} · by {longDate(g.date)}</span>
                      <span className={`tag ${g.onTrack ? 'tag-ok' : 'tag-warn'}`}>{g.onTrack ? 'On track' : g.doneDate ? `~${Math.abs(g.slipMonths)} mo late` : 'Off track'}</span></div>
                  </div>
                );
              })}
            </div>
          ) : <p className="muted">No goals yet. <button className="link" onClick={() => go('profile')}>Add one</button></p>}
        </Reveal>
        <Reveal className="card" delay={100}>
          <div className="card-head"><h3><Icon name="repeat" /> Coming up</h3><button className="link" onClick={() => go('recurring')}>All recurring</button></div>
          {upcoming.length ? (
            <ul className="upcoming">
              {upcoming.map((r) => (
                <li key={r.key}>
                  <div className="date-chip"><b>{new Date(r.nextDate).getDate()}</b><span>{new Date(r.nextDate).toLocaleString('en', { month: 'short' })}</span></div>
                  <div className="grow"><b>{r.name}</b><span className="muted small">{r.cadence} · {r.inDays <= 0 ? 'due now' : `in ${r.inDays} days`}</span></div>
                  <b className="num">{money(r.lastAmount)}</b>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No recurring charges expected in the next 30 days.</p>}
        </Reveal>
      </section>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
