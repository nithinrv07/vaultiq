import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { ProjectionChart } from '../components/Charts.jsx';
import { CatPill, Icon, PageHead, Reveal } from '../components/ui.jsx';
import { catColor } from '../lib/categories.js';
import { money, monthKey, monthLabel } from '../lib/format.js';
import { simulate } from '../lib/model.js';
import { answer } from '../lib/coach.js';

function Range(props) {
  const { min, max, value } = props;
  return <input type="range" {...props} style={{ '--v': `${((value - min) / ((max - min) || 1)) * 100}%` }} />;
}


export default function Planner({ params = {} }) {
  const store = useStore();
  const { profile, base, recurring } = store;
  const [cuts, setCuts] = useState(params.cut ? { [params.cut]: 0.2 } : {});
  const [rentDelta, setRentDelta] = useState(0);
  const [incomeRs, setIncomeRs] = useState(0); // change in monthly income, in rupees
  const [extra, setExtra] = useState(0);
  const [oneOff, setOneOff] = useState(0);
  const [ask, setAsk] = useState('');
  const [reply, setReply] = useState(null);
  const [more, setMore] = useState(false);

  const rent = profile.fixedCosts.filter((f) => f.category === 'Housing').reduce((a, f) => a + +f.amount, 0);
  const flaggedSubs = recurring.filter((r) => r.status === 'cancel' || r.alerts.some((a) => a.type === 'unused')).reduce((a, r) => a + r.monthly, 0);
  const baseIncome = Number(profile.monthlyIncome) || base.income || 1;
  const incomeDelta = incomeRs / baseIncome;
  const scenario = { cuts, rentDelta, incomeDelta, extraSaving: extra, oneOff };
  const now = useMemo(() => simulate(profile, base), [profile, base]);
  const sim = useMemo(() => simulate(profile, base, scenario), [profile, base, cuts, rentDelta, incomeRs, extra, oneOff]);
  const dirty = Object.values(cuts).some((v) => v) || rentDelta || incomeRs || extra || oneOff;
  const r100 = (n) => Math.round(n / 100) * 100;
  const PRESETS = [
    { label: `Spend ${money(r100((base.byCat.Dining || 0) * 0.3))} less on dining`, s: { cuts: { Dining: 0.3 } } },
    { label: `Rent up ${money(r100(rent * 0.1))}`, s: { rentRs: r100(rent * 0.1) } },
    { label: `Raise of ${money(r100(baseIncome * 0.1))}`, s: { incomeRs: r100(baseIncome * 0.1) } },
    { label: `Cancel flagged subs (${money(flaggedSubs)})`, s: { cancelSubs: true } },
    { label: 'Lean month on wants', s: { cuts: { Dining: 0.2, Shopping: 0.2, Entertainment: 0.2, Travel: 0.2 } } },
  ];
  const cats = Object.entries(base.byCat).filter(([c]) => !profile.fixedCosts.some((f) => f.category === c)).sort((a, b) => b[1] - a[1]);

  function preset(p) {
    reset();
    if (p.cuts) setCuts(p.cuts);
    if (p.rentRs) setRentDelta(p.rentRs);
    if (p.incomeRs) setIncomeRs(p.incomeRs);
    if (p.cancelSubs) setExtra(Math.round(flaggedSubs));
  }
  function reset() { setCuts({}); setRentDelta(0); setIncomeRs(0); setExtra(0); setOneOff(0); setReply(null); }
  function runAsk(e) {
    e.preventDefault();
    const r = answer(ask, store);
    setReply(r);
    if (r.scenario) { reset(); setReply(r); if (r.scenario.cuts) setCuts(r.scenario.cuts); if (r.scenario.rentDelta) setRentDelta(r.scenario.rentDelta); if (r.scenario.incomeDelta) setIncomeRs(r100(r.scenario.incomeDelta * baseIncome)); }
  }
  const fmtM = (d) => (d ? monthLabel(monthKey(d)) + ' ' + d.slice(0, 4) : '7+ yrs');

  return (
    <>
      <PageHead eyebrow="Plan ahead" title={<>What if…<em>?</em></>} sub="Move a slider or tap an idea. You'll instantly see how much more you'd have and when you'd reach your goals." />

      <Reveal className="card ask">
        <form onSubmit={runAsk} className="ask-form">
          <Icon name="spark" />
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder='Type a question, e.g. "what if my rent goes up by 4000"' />
          <button className="btn btn-primary">Show me</button>
        </form>
        <div className="chips">{PRESETS.map((p) => <button key={p.label} className="chip" onClick={() => preset(p.s)}>{p.label}</button>)}{dirty ? <button className="chip chip-reset" onClick={reset}>Reset</button> : null}</div>
        {reply && <div className={`reply ${reply.guardrail ? 'reply-guard' : ''}`}>{reply.guardrail && <b><Icon name="shield" size={15} /> Good to know</b>}{reply.text}</div>}
      </Reveal>

      <section className="grid-1-2">
        <Reveal className="card levers">
          <h3>Try a change</h3>
          <h4 className="lever-sub first">Spend less on…</h4>
          {cats.slice(0, 3).map(([c, v]) => (
            <div key={c} className="lever lever-cat" style={{ '--c': catColor(c) }}>
              <div className="row between"><CatPill cat={c} small /><span className="small"><b className={cuts[c] ? 'pos' : ''}>{cuts[c] ? `save ${money(v * cuts[c])}` : '—'}</b> <span className="muted">{money(v * (1 - (cuts[c] || 0)))}/mo</span></span></div>
              <Range min={0} max={Math.round(v)} step={v > 2000 ? 50 : 10} value={Math.round((cuts[c] || 0) * v)} onChange={(e) => setCuts({ ...cuts, [c]: Math.min(1, +e.target.value / v) })} />
            </div>
          ))}
          <div className="lever">
            <div className="row between"><span>If my income changes by</span><b className={incomeRs ? (incomeRs > 0 ? 'pos' : 'neg') : ''}>{money(incomeRs, { sign: true })}</b></div>
            <Range min={-r100(baseIncome * 0.5)} max={r100(baseIncome * 0.5)} step={500} value={incomeRs} onChange={(e) => setIncomeRs(+e.target.value)} />
          </div>
          <div className="lever">
            <div className="row between"><span>If my rent changes by</span><b className={rentDelta ? (rentDelta > 0 ? 'neg' : 'pos') : ''}>{money(rentDelta, { sign: true })}</b></div>
            <Range min={-Math.round(rent * 0.5) || -10000} max={Math.round(rent * 0.5) || 10000} step={100} value={rentDelta} onChange={(e) => setRentDelta(+e.target.value)} />
          </div>
          <button className="more-toggle" onClick={() => setMore(!more)}>{more ? 'Fewer options' : 'More options'} <Icon name="arrow" size={14} className={more ? 'up' : 'down'} /></button>
          {more && (
            <div className="more-levers">
              <div className="lever">
                <div className="row between"><span>Save extra each month</span><b>{money(extra)}</b></div>
                <Range min={0} max={Math.max(20000, Math.round(now.income * 0.3))} step={250} value={extra} onChange={(e) => setExtra(+e.target.value)} />
                {flaggedSubs > 0 && <button className="link small" onClick={() => setExtra(Math.round(flaggedSubs))}>Use what I'd save by cancelling unused subscriptions ({money(flaggedSubs)})</button>}
              </div>
              <div className="lever">
                <div className="row between"><span>A big expense today</span><b className={oneOff ? 'neg' : ''}>{money(oneOff)}</b></div>
                <Range min={0} max={Math.max(100000, Math.round(now.income * 2))} step={1000} value={oneOff} onChange={(e) => setOneOff(+e.target.value)} />
              </div>
              {cats.length > 3 && <h4 className="lever-sub">Other spending</h4>}
              {cats.slice(3).map(([c, v]) => (
            <div key={c} className="lever lever-cat" style={{ '--c': catColor(c) }}>
              <div className="row between"><CatPill cat={c} small /><span className="small"><b className={cuts[c] ? 'pos' : ''}>{cuts[c] ? `save ${money(v * cuts[c])}` : '—'}</b> <span className="muted">{money(v * (1 - (cuts[c] || 0)))}/mo</span></span></div>
              <Range min={0} max={Math.round(v)} step={v > 2000 ? 50 : 10} value={Math.round((cuts[c] || 0) * v)} onChange={(e) => setCuts({ ...cuts, [c]: Math.min(1, +e.target.value / v) })} />
            </div>
          ))}
            </div>
          )}
        </Reveal>

        <div className="stack">
          <Reveal className="card">
            <div className="sim-kpis">
              <div><span className="eyebrow">Money left each month</span><strong>{money(sim.surplus)}</strong>{dirty ? <span className={`delta ${sim.surplus >= now.surplus ? 'pos' : 'neg'}`}>{money(sim.surplus - now.surplus, { sign: true })}</span> : null}</div>
              <div><span className="eyebrow">Saved per year</span><strong>{money(sim.surplus * 12, { compact: true })}</strong>{dirty ? <span className={`delta ${sim.surplus >= now.surplus ? 'pos' : 'neg'}`}>{money((sim.surplus - now.surplus) * 12, { compact: true, sign: true })}</span> : null}</div>
              <div><span className="eyebrow">Safety money ready in</span><strong>{sim.efDoneAt === 0 ? 'Now' : sim.efDoneAt ? `${sim.efDoneAt} mo` : '—'}</strong>{dirty && now.efDoneAt !== sim.efDoneAt ? <span className="delta">was {now.efDoneAt ?? '—'} mo</span> : null}</div>
              <div><span className="eyebrow">Saved in 5 yrs</span><strong>{money(sim.series[59].total, { compact: true })}</strong>{dirty ? <span className={`delta ${sim.series[59].total >= now.series[59].total ? 'pos' : 'neg'}`}>{money(sim.series[59].total - now.series[59].total, { compact: true, sign: true })}</span> : null}</div>
            </div>
            <ProjectionChart base={now.series} scenario={dirty ? sim.series : null}
              markers={sim.goals.map((g, i) => ({ label: g.name, m: g.doneAt, color: ['var(--coral)', 'var(--violet)', 'var(--sky)', 'var(--gold)'][i % 4] }))} />
            <div className="legend"><span><i style={{ background: 'var(--forest)' }} />Right now</span>{dirty ? <span><i style={{ background: 'var(--lime-deep)' }} />With your change</span> : null}<span className="muted small">Dots = a goal reached</span></div>
          </Reveal>

          <Reveal className="card">
            <div className="card-head"><h3>When you'll reach your goals</h3></div>
            <table className="table goal-table">
              <thead><tr><th>Goal</th><th>Target date</th><th>Right now</th><th>With this change</th><th /></tr></thead>
              <tbody>
                {sim.goals.map((g, i) => {
                  const o = now.goals[i];
                  const better = g.doneDate && (!o.doneDate || g.doneDate < o.doneDate);
                  const worse = o.doneDate && (!g.doneDate || g.doneDate > o.doneDate);
                  return (
                    <tr key={g.id}>
                      <td><b>{g.name}</b><div className="muted small">{money(g.target)}</div></td>
                      <td>{fmtM(g.date)}</td>
                      <td>{fmtM(o.doneDate)}</td>
                      <td className={better ? 'pos' : worse ? 'neg' : ''}><b>{fmtM(g.doneDate)}</b></td>
                      <td><span className={`tag ${g.onTrack ? 'tag-ok' : 'tag-warn'}`}>{g.onTrack ? 'On time' : 'Late'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sim.goals.length && <p className="muted">Add goals in your profile to see their timeline.</p>}
          </Reveal>

          <Reveal className="card breakdown">
            <h3>Monthly picture</h3>
            <div className="flow">
              <div className="flow-row"><span>Income</span><b className="pos">{money(sim.income)}</b></div>
              <div className="flow-row"><span>Regular bills</span><b>−{money(sim.fixed)}</b></div>
              <div className="flow-row"><span>Everyday spending</span><b>−{money(sim.variable)}</b></div>
              {extra ? <div className="flow-row"><span>Extra saving</span><b className="pos">+{money(extra)}</b></div> : null}
              <div className="flow-row total"><span>Money left for goals & savings</span><b>{money(sim.surplus)}</b></div>
            </div>
            <div className="stackbar">
              {[['Bills', sim.fixed, 'var(--ink-2)'], ['Spending', sim.variable, 'var(--coral)'], ['Left', Math.max(0, sim.surplus), 'var(--forest)']].map(([l, v, c]) => (
                <div key={l} style={{ flex: Math.max(0.001, v), background: c }} title={`${l} ${money(v)}`}><span>{l}</span></div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      <p className="disclaimer"><Icon name="shield" size={14} /> Scenarios are educational models built from your own numbers. They don't account for investment returns, taxes or inflation, and they're not financial advice.</p>
    </>
  );
}
