import { useStore } from '../store.jsx';
import { Sparkline } from '../components/Charts.jsx';
import { CatPill, CountUp, Empty, Icon, PageHead, Reveal } from '../components/ui.jsx';
import { daysBetween, longDate, money, todayStr } from '../lib/format.js';

const ALERT_LABEL = { 'price-up': 'Price up', 'price-down': 'Price down', missed: 'Missed charge', unused: 'Unused?' };

export default function Recurring({ go, toast }) {
  const { recurring, setUsage } = useStore();
  if (!recurring.length) return (<><PageHead eyebrow="Recurring" title="Subscriptions & bills" /><Empty title="No patterns yet" body="I need at least two or three cycles of a charge to spot it. Import more history." action={<button className="btn btn-primary" onClick={() => go('import')}>Import</button>} /></>);
  const active = recurring.filter((r) => r.status !== 'cancel');
  const monthly = active.reduce((a, r) => a + r.monthly, 0);
  const subs = active.filter((r) => r.category === 'Subscriptions');
  const flagged = recurring.filter((r) => r.alerts.length);
  const cancelSave = recurring.filter((r) => r.status === 'cancel').reduce((a, r) => a + r.monthly, 0);

  return (
    <>
      <PageHead eyebrow="Recurring" title={<>The money that <em>moves on its own</em>.</>} sub="Detected from regular cadence and stable amounts. I watch for price changes, missed charges and things you've stopped using." />
      <section className="kpis kpis-3">
        <Reveal className="card kpi"><span className="eyebrow">Recurring / month</span><strong className="kpi-v"><CountUp value={monthly} /></strong><span className="muted small">{money(monthly * 12)} a year across {active.length}</span></Reveal>
        <Reveal className="card kpi" delay={80}><span className="eyebrow">Subscriptions</span><strong className="kpi-v"><CountUp value={subs.reduce((a, r) => a + r.monthly, 0)} /></strong><span className="muted small">{subs.length} services</span></Reveal>
        <Reveal className="card kpi kpi-accent" delay={160}><span className="eyebrow">Needs attention</span><strong className="kpi-v">{flagged.length}</strong><span className="muted small">{cancelSave ? `${money(cancelSave)}/mo marked to cancel` : 'price changes · unused · missed'}</span></Reveal>
      </section>

      <section className="rec-grid">
        {recurring.map((r, i) => (
          <Reveal key={r.key} delay={(i % 3) * 70} className={`card rec ${r.alerts.length ? 'has-alert' : ''} ${r.status === 'cancel' ? 'is-cancel' : ''}`}>
            <div className="row between">
              <div><h4>{r.name}</h4><CatPill cat={r.category} small /></div>
              <div className="r"><b className="num big">{money(r.lastAmount)}</b><span className="muted small">/{r.cadence.replace('ly', '').replace('dai', 'day')}</span></div>
            </div>
            <div className="row between rec-mid">
              <Sparkline values={r.history.map((h) => h.amount)} color={r.alerts.some((a) => a.type === 'price-up') ? 'var(--coral)' : 'var(--forest)'} />
              <div className="r small"><span className="muted">Next</span><br /><b>{longDate(r.nextDate)}</b></div>
            </div>
            {r.alerts.map((a) => <div key={a.type} className={`alert alert-${a.type}`}><b>{ALERT_LABEL[a.type]}</b> {a.text}</div>)}
            <div className="row between rec-foot">
              <span className="muted small">{r.count} charges · {Math.round(r.regularity * 100)}% on schedule{r.lastUsed ? ` · used ${daysBetween(r.lastUsed, new Date())}d ago` : ''}</span>
              <div className="row gap-s">
                {['Subscriptions', 'Entertainment'].includes(r.category) && r.status !== 'cancel' &&
                  <button className="btn btn-s" onClick={() => { setUsage(r.key, { lastUsed: todayStr() }); toast({ title: `Noted — you use ${r.name}`, body: 'I\'ll check in again in a month.' }); }}><Icon name="check" size={14} />I use this</button>}
                <button className={`btn btn-s ${r.status === 'cancel' ? '' : 'btn-ghost-danger'}`} onClick={() => setUsage(r.key, { status: r.status === 'cancel' ? 'active' : 'cancel' })}>{r.status === 'cancel' ? 'Undo' : 'Plan to cancel'}</button>
              </div>
            </div>
          </Reveal>
        ))}
      </section>
    </>
  );
}
