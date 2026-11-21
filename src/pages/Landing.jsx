import { useEffect, useRef, useState } from 'react';
import { CountUp, Icon, Reveal } from '../components/ui.jsx';
import { catColor } from '../lib/categories.js';

const RAW = [
  ['UPI/431298/SWIGGY@ICICI/FOOD', 'Swiggy', 'Dining', '−₹452'],
  ['POS 4821 BIGBASKET CHENNAI IN', 'BigBasket', 'Groceries', '−₹1,846'],
  ['ACH D- NETFLIX.COM 0049', 'Netflix', 'Subscriptions', '−₹649'],
  ['NEFT CR-ACME TECH PVT-SAL NOV', 'Acme Tech', 'Income', '+₹95,000'],
  ['Rs.230 paid to UBER INDIA via UPI', 'Uber', 'Transport', '−₹230'],
  ['BILLDESK*TNEB ELEC 99812', 'TNEB', 'Utilities', '−₹1,893'],
  ['IMPS/P2A/LANDLORD KUMAR/RENT', 'Rent', 'Housing', '−₹24,000'],
  ['CULT.FIT MEMBERSHIP RENEWAL', 'Cult.fit', 'Subscriptions', '−₹1,500'],
];

const FEATURES = [
  ['upload', 'Messy-format ingestion', 'PDF statements, CSV exports from any bank and raw transaction SMS — parsed locally, deduplicated, auto-categorised.'],
  ['brain', 'Learns from corrections', 'Fix a category once. A merchant rule is created, history is re-filed, and every future import follows it.'],
  ['repeat', 'Subscription radar', 'Detects weekly, monthly, quarterly and yearly charges. Alerts on price hikes, missed charges and things you stopped using.'],
  ['user', 'Persistent profile', 'Income, fixed costs, emergency fund and dated goals — one living model that every number flows from.'],
  ['sliders', 'What-if planner', '“Cut dining out 30%.” “Rent goes up.” Re-run seven years of cash flow and see goal dates move instantly.'],
  ['bell', 'Drift nudges', 'Pace-aware alerts that notice mid-month when a category is heading over plan — while there is still time.'],
  ['report', 'Monthly review', 'A printable recap: what came in, what went out, movers, top merchants, subscriptions and goal checkpoints.'],
  ['shield', 'Honest guardrails', 'The coach educates and models scenarios. It never tells you which stock, fund or coin to buy.'],
];

const STEPS = [
  { k: 'Ingest', t: 'Throw it the mess.', b: 'Statements in three formats, SMS with typos, column headers buried under bank boilerplate. It finds the rows that matter.' },
  { k: 'Learn', t: 'Correct once. It remembers.', b: 'Say “Cult.fit is Health, not Subscriptions.” Twelve past charges are re-filed and the rule sticks.' },
  { k: 'Plan', t: 'Ask “what if?”', b: 'Every lever re-runs your model. Watch a goal slide three months earlier when dinners out drop by a third.' },
  { k: 'Nudge', t: 'Hear about drift early.', b: 'Mid-month, on pace to overshoot? You get a nudge while the month is still yours to steer.' },
];

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setY(window.scrollY)); };
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, []);
  return y;
}
function useSectionProgress(ref) {
  const y = useScrollY();
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    setP(Math.max(0, Math.min(1, -r.top / Math.max(1, total))));
  }, [y, ref]);
  return p;
}
function useInViewProgress(ref) {
  const y = useScrollY();
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setP(Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height))));
  }, [y, ref]);
  return p;
}

export default function Landing({ enter, demo }) {
  const y = useScrollY();
  const docH = typeof document !== 'undefined' ? document.documentElement.scrollHeight - window.innerHeight : 1;
  const story = useRef(null);
  const sp = useSectionProgress(story);
  const step = Math.min(STEPS.length - 1, Math.floor(sp * STEPS.length * 0.999));
  const marq = useRef(null);
  const mp = useInViewProgress(marq);
  const cta = useRef(null);
  const cp = useInViewProgress(cta);

  return (
    <div className="landing">
      <div className="scroll-bar" style={{ transform: `scaleX(${y / Math.max(1, docH)})` }} />
      <nav className={`lnav ${y > 40 ? 'is-scrolled' : ''}`}>
        <a className="brand" href="#/"><span className="brand-mark"><Icon name="leaf" size={16} /></span>Evergreen</a>
        <div className="lnav-links">
          <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how').scrollIntoView({ behavior: 'smooth' }); }}>How it works</a>
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features').scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
          <a href="#guardrails" onClick={(e) => { e.preventDefault(); document.getElementById('guardrails').scrollIntoView({ behavior: 'smooth' }); }}>Guardrails</a>
        </div>
        <button className="btn btn-lime" onClick={enter}>Open app <Icon name="arrow" size={16} /></button>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-grid" style={{ transform: `translateY(${y * 0.25}px)` }} />
        <div className="hero-orb" style={{ transform: `translate(-50%, ${y * -0.12}px) scale(${1 + y / 2500})` }} />
        <div className="hero-inner" style={{ opacity: Math.max(0, 1 - y / 700), transform: `translateY(${y * 0.18}px)` }}>
          <span className="hero-kicker"><i />A personal finance coach with a living money model</span>
          <h1 className="hero-title">
            {['Your', 'money,', 'finally'].map((w, i) => <span key={w} className="word" style={{ animationDelay: `${120 + i * 110}ms` }}>{w}&nbsp;</span>)}
            <br />
            {['understood.'].map((w, i) => <span key={w} className="word word-em" style={{ animationDelay: `${480 + i * 110}ms` }}><em>{w}</em></span>)}
          </h1>
          <p className="hero-sub fade-in" style={{ animationDelay: '800ms' }}>Most budgeting apps sort transactions and stop. Evergreen learns your goals, models your future, and adapts as life changes.</p>
          <div className="hero-cta fade-in" style={{ animationDelay: '950ms' }}>
            <button className="btn btn-lime btn-lg" onClick={demo}><Icon name="spark" />Try with demo data</button>
            <button className="btn btn-glass btn-lg" onClick={enter}>Start fresh</button>
          </div>
        </div>
        <div className="hero-float" aria-hidden>
          {RAW.slice(0, 6).map((r, i) => (
            <div key={i} className={`float-chip f${i}`} style={{ transform: `translateY(${y * (0.08 + (i % 3) * 0.07) * (i % 2 ? -1 : 1)}px)` }}>
              <i style={{ background: catColor(r[2]) }} /><span>{r[1]}</span><b>{r[3]}</b>
            </div>
          ))}
        </div>
        <div className="scroll-cue"><span>Scroll</span><i /></div>
      </header>

      {/* MARQUEE: raw → clean */}
      <section className="transform-band" ref={marq}>
        <div className="band-label"><span>What your bank sends</span><span>What Evergreen sees</span></div>
        <div className="band-row raw" style={{ transform: `translateX(${-mp * 40}%)` }}>
          {[...RAW, ...RAW].map((r, i) => <code key={i}>{r[0]}</code>)}
        </div>
        <div className="band-row clean" style={{ transform: `translateX(${-40 + mp * 40}%)` }}>
          {[...RAW, ...RAW].map((r, i) => <span key={i} className="clean-chip"><i style={{ background: catColor(r[2]) }} />{r[1]}<em>{r[2]}</em><b>{r[3]}</b></span>)}
        </div>
      </section>

      {/* STICKY STORY */}
      <section id="how" className="story" ref={story}>
        <div className="story-sticky">
          <div className="story-text">
            <span className="eyebrow light">How it works</span>
            <div className="story-steps">
              {STEPS.map((s, i) => (
                <div key={s.k} className={`story-step ${i === step ? 'on' : i < step ? 'past' : ''}`}>
                  <span className="story-k">0{i + 1} · {s.k}</span>
                  <h2>{s.t}</h2>
                  <p>{s.b}</p>
                </div>
              ))}
            </div>
            <div className="story-progress">{STEPS.map((s, i) => <span key={s.k} className={i <= step ? 'on' : ''} style={i === step ? { '--f': (sp * STEPS.length) % 1 } : undefined} />)}</div>
          </div>
          <div className="story-visual">
            <div className={`device s${step}`}>
              <div className="device-top"><span /><span /><span /><b>{STEPS[step].k}</b></div>
              {/* 0 ingest */}
              <div className="pane pane-0">
                {RAW.slice(0, 6).map((r, i) => (
                  <div key={i} className="ingest-row" style={{ transitionDelay: `${i * 80}ms` }}>
                    <code>{r[0]}</code><Icon name="arrow" size={14} /><span className="mini-pill" style={{ '--c': catColor(r[2]) }}>{r[2]}</span>
                  </div>
                ))}
              </div>
              {/* 1 learn */}
              <div className="pane pane-1">
                <div className="learn-card">
                  <span className="eyebrow">Correction</span>
                  <div className="learn-row"><span>CULT.FIT MEMBERSHIP</span><span className="mini-pill strike" style={{ '--c': catColor('Subscriptions') }}>Subscriptions</span><Icon name="arrow" size={14} /><span className="mini-pill" style={{ '--c': catColor('Health') }}>Health</span></div>
                  <div className="learn-rule"><Icon name="brain" size={16} /> Rule learned: <code>cult fit</code> → Health</div>
                  <div className="learn-stack">{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ transitionDelay: `${300 + i * 90}ms` }}><span>Cult.fit · {['Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</span><span className="mini-pill" style={{ '--c': catColor('Health') }}>Health ✓</span></div>)}</div>
                </div>
              </div>
              {/* 2 plan */}
              <div className="pane pane-2">
                <div className="plan-lever"><span>Dining out</span><div className="plan-track"><div className="plan-fill" /></div><b>−30%</b></div>
                <svg viewBox="0 0 300 150" className="plan-chart">
                  <path d="M0,140 C60,128 120,110 180,86 S270,48 300,40" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="4 5" />
                  <path className="plan-line" d="M0,140 C60,122 120,96 180,66 S270,22 300,12" fill="none" stroke="var(--lime)" strokeWidth="3" />
                  <circle className="plan-dot" cx="214" cy="46" r="6" fill="var(--lime)" />
                </svg>
                <div className="plan-goal"><Icon name="target" size={15} /> Laptop fund: <s>Sep</s> → <b>Jul</b></div>
              </div>
              {/* 3 nudge */}
              <div className="pane pane-3">
                <div className="notif n1"><span className="notif-ic" style={{ background: 'var(--coral)' }}><Icon name="bell" size={14} /></span><div><b>Dining is drifting</b><p>On pace for ₹7,900 vs a ₹5,800 plan. Easing off ₹190/day keeps you on track.</p></div></div>
                <div className="notif n2"><span className="notif-ic" style={{ background: 'var(--violet)' }}><Icon name="repeat" size={14} /></span><div><b>Netflix went up 30%</b><p>₹499 → ₹649. That's ₹1,800 more a year.</p></div></div>
                <div className="notif n3"><span className="notif-ic" style={{ background: 'var(--gold)' }}><Icon name="spark" size={14} /></span><div><b>Cult.fit unused for 52 days</b><p>That's ₹2,600 paid since your last visit.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <Reveal className="section-head">
          <span className="eyebrow">Everything in the model</span>
          <h2 className="display-lg">Eight parts. <em>One living picture.</em></h2>
        </Reveal>
        <div className="feature-grid">
          {FEATURES.map(([ic, t, b], i) => (
            <Reveal key={t} delay={(i % 4) * 90} variant={i % 2 ? 'up' : 'scale'} className="feature" onMouseMove={tilt} onMouseLeave={untilt}>
              <span className="feature-n">0{i + 1}</span>
              <span className="feature-ic"><Icon name={ic} size={22} /></span>
              <h3>{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        {[[3, (v) => Math.round(v), 'statement formats parsed', ''], [84, (v) => Math.round(v), 'months simulated per what-if', ''], [0, (v) => Math.round(v), 'bytes sent to a server', ''], [100, (v) => `${Math.round(v)}%`, 'of the model is yours to edit', '']].map(([v, f, l], i) => (
          <Reveal key={l} delay={i * 100} className="stat"><strong><CountUp value={v} format={f} duration={1600} /></strong><span>{l}</span></Reveal>
        ))}
      </section>

      {/* GUARDRAILS */}
      <section id="guardrails" className="guard">
        <Reveal variant="left" className="guard-text">
          <span className="eyebrow light">Guardrails</span>
          <h2 className="display-lg">A coach, <em>not a stock tipster.</em></h2>
          <p>Evergreen explains risk, fees, diversification and inflation, and models what your own numbers can do. It will never tell you which security to buy — that belongs with a registered adviser who knows your whole picture.</p>
          <ul className="checks">
            <li><Icon name="check" size={16} />Educates on concepts</li>
            <li><Icon name="check" size={16} />Models scenarios with your data</li>
            <li><Icon name="x" size={16} />No stock, fund, ETF or crypto picks</li>
          </ul>
        </Reveal>
        <Reveal variant="right" delay={150} className="guard-chat">
          <div className="msg msg-me"><p>Which stock should I buy with my bonus?</p></div>
          <div className="msg msg-coach msg-guard"><span className="guard-tag"><Icon name="shield" size={13} /> Guardrail</span><p>I can't recommend specific stocks, funds or coins. What I can do: check your emergency fund is full, model how much of the bonus fits your goals, and explain diversification and costs so you're ready to talk to an adviser.</p></div>
          <div className="msg msg-me"><p>OK — what if I put ₹20k toward the Goa trip?</p></div>
          <div className="msg msg-coach"><p>Goa trip moves from <b>March</b> to <b>January</b>. Your laptop goal is unchanged.</p></div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="cta" ref={cta}>
        <h2 style={{ transform: `scale(${0.82 + cp * 0.28})`, opacity: 0.3 + cp }}>Let your money <em>grow a plan.</em></h2>
        <div className="row gap center">
          <button className="btn btn-lime btn-lg" onClick={demo}><Icon name="spark" />Explore the demo</button>
          <button className="btn btn-glass btn-lg" onClick={enter}>Import my statements</button>
        </div>
        <p className="foot">Evergreen runs entirely in your browser. Educational tool — not financial advice.</p>
      </section>
    </div>
  );
}

function tilt(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${-y * 6}deg`); el.style.setProperty('--ry', `${x * 8}deg`);
  el.style.setProperty('--mx', `${(x + 0.5) * 100}%`); el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
}
function untilt(e) { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); }
