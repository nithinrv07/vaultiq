import { useStore } from '../store.jsx';
import { Icon, PageHead, Reveal, CatSelect, CatPill } from '../components/ui.jsx';
import { CATEGORIES } from '../lib/categories.js';
import { money, ymd, addMonths, uid } from '../lib/format.js';
import { effectiveBudgets, simulate } from '../lib/model.js';

export default function Profile({ toast }) {
  const { profile, setProfile, base, reset, loadDemo } = useStore();
  const sim = simulate(profile, base);
  const budgets = effectiveBudgets(profile, base);
  const setFixed = (id, patch) => setProfile((p) => ({ fixedCosts: p.fixedCosts.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  const setGoal = (id, patch) => setProfile((p) => ({ goals: p.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  const num = (v) => (v === '' ? '' : Number(v));

  return (
    <>
      <PageHead eyebrow="Financial profile" title={<>The <em>shape</em> of your money.</>} sub="This is the persistent model every projection, nudge and review is built on. Saved automatically on this device." />

      <section className="grid-1-1">
        <Reveal className="card">
          <div className="card-head"><h3>Income & basics</h3></div>
          <div className="form-grid">
            <label className="span-2">Your name<input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="Optional" /></label>
            <label className="span-2">Monthly take-home income<input type="number" value={profile.monthlyIncome} onChange={(e) => setProfile({ monthlyIncome: num(e.target.value) })} />
              <span className="hint">Imported average: {money(base.income)}/mo {base.income > 0 && <button className="link" onClick={() => setProfile({ monthlyIncome: Math.round(base.income) })}>use it</button>}</span></label>
          </div>
        </Reveal>
        <Reveal className="card" delay={100}>
          <div className="card-head"><h3><Icon name="shield" /> Emergency fund</h3></div>
          <div className="form-grid">
            <label>Saved so far<input type="number" value={profile.emergencyFund.current} onChange={(e) => setProfile((p) => ({ emergencyFund: { ...p.emergencyFund, current: num(e.target.value) } }))} /></label>
            <label>Target (months of essentials)<input type="number" min="1" max="24" value={profile.emergencyFund.targetMonths} onChange={(e) => setProfile((p) => ({ emergencyFund: { ...p.emergencyFund, targetMonths: num(e.target.value) } }))} /></label>
          </div>
          <div className="ef-bar"><div style={{ width: `${Math.min(100, (profile.emergencyFund.current / Math.max(1, sim.efTarget)) * 100)}%` }} /></div>
          <p className="muted small">Essentials ≈ {money(sim.essentials)}/mo → target {money(sim.efTarget)}. {sim.efDoneAt ? `Fully funded in ~${sim.efDoneAt} month(s) at your current surplus.` : profile.emergencyFund.current >= sim.efTarget ? 'Fully funded ✓' : 'Not reached at the current surplus.'}</p>
        </Reveal>
      </section>

      <Reveal className="card">
        <div className="card-head"><h3>Fixed costs</h3><span className="muted small">Total {money(sim.fixed)}/mo</span></div>
        <div className="rows-edit">
          {profile.fixedCosts.map((f) => (
            <div key={f.id} className="row-edit">
              <input value={f.name} onChange={(e) => setFixed(f.id, { name: e.target.value })} placeholder="Name" />
              <CatSelect value={f.category} onChange={(c) => setFixed(f.id, { category: c })} />
              <input type="number" value={f.amount} onChange={(e) => setFixed(f.id, { amount: num(e.target.value) })} />
              <button className="icon-btn" onClick={() => setProfile((p) => ({ fixedCosts: p.fixedCosts.filter((x) => x.id !== f.id) }))}><Icon name="trash" size={15} /></button>
            </div>
          ))}
        </div>
        <button className="btn btn-s" onClick={() => setProfile((p) => ({ fixedCosts: [...p.fixedCosts, { id: uid(), name: '', amount: 0, category: 'Housing' }] }))}><Icon name="plus" size={14} />Add fixed cost</button>
      </Reveal>

      <Reveal className="card">
        <div className="card-head"><h3><Icon name="target" /> Goals</h3><span className="muted small">Funded in deadline order after 30% goes to your emergency fund</span></div>
        <div className="goals-edit">
          {profile.goals.map((g) => {
            const s = sim.goals.find((x) => x.id === g.id);
            return (
              <div key={g.id} className="goal-edit">
                <input className="goal-name" value={g.name} onChange={(e) => setGoal(g.id, { name: e.target.value })} placeholder="Goal name" />
                <label>Target<input type="number" value={g.target} onChange={(e) => setGoal(g.id, { target: num(e.target.value) })} /></label>
                <label>Saved<input type="number" value={g.saved} onChange={(e) => setGoal(g.id, { saved: num(e.target.value) })} /></label>
                <label>By<input type="date" value={g.date} onChange={(e) => setGoal(g.id, { date: e.target.value })} /></label>
                <div className="goal-status">
                  <span className={`tag ${s?.onTrack ? 'tag-ok' : 'tag-warn'}`}>{s?.onTrack ? 'On track' : 'Behind'}</span>
                  <span className="muted small">needs {money(s?.needPerMonth || 0)}/mo</span>
                </div>
                <button className="icon-btn" onClick={() => setProfile((p) => ({ goals: p.goals.filter((x) => x.id !== g.id) }))}><Icon name="trash" size={15} /></button>
              </div>
            );
          })}
        </div>
        <button className="btn btn-s" onClick={() => setProfile((p) => ({ goals: [...p.goals, { id: uid(), name: 'New goal', target: 50000, saved: 0, date: ymd(addMonths(new Date(), 12)) }] }))}><Icon name="plus" size={14} />Add goal</button>
      </Reveal>

      <Reveal className="card">
        <div className="card-head"><h3>Monthly plan per category</h3><span className="muted small">Defaults to your 3-month average · nudges fire when you drift</span></div>
        <div className="budget-edit">
          {CATEGORIES.filter((c) => c.kind === 'variable').map((c) => (
            <label key={c.id} className="budget-cell">
              <CatPill cat={c.id} small />
              <input type="number" placeholder={Math.round(base.byCat[c.id] || 0)} value={profile.budgets?.[c.id] ?? ''} onChange={(e) => setProfile((p) => ({ budgets: { ...p.budgets, [c.id]: num(e.target.value) } }))} />
              <span className="hint">{profile.budgets?.[c.id] ? 'custom' : budgets[c.id] ? `auto ${money(budgets[c.id])}` : '—'}</span>
            </label>
          ))}
        </div>
      </Reveal>

      <Reveal className="card row between wrap gap">
        <div><h3>Data</h3><p className="muted small">Signed in: synced to your account. Guest: stored only in this browser.</p></div>
        <div className="row gap">
          <button className="btn" onClick={() => { if (confirm('Replace your data with the demo dataset?')) { loadDemo(); toast({ title: 'Demo data loaded' }); } }}>Reload demo</button>
          <button className="btn btn-ghost-danger" onClick={() => { if (confirm('Erase all transactions, rules and profile?')) { reset(); toast({ title: 'All data erased' }); } }}>Erase everything</button>
        </div>
      </Reveal>
    </>
  );
}
