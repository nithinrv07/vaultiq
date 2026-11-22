import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { Icon, PageHead, Reveal } from '../components/ui.jsx';
import { answer } from '../lib/coach.js';

const SUGGEST = ['How am I doing?', 'What if I cut dining by 30%?', 'What if my rent goes up by 3000?', 'Where does my money go?', 'Which stock should I buy?', 'How much can I invest each month?', 'Explain emergency fund', 'What if I lose my job?'];

export default function Coach() {
  const store = useStore();
  const [msgs, setMsgs] = useState([{ from: 'coach', text: "Hi — I'm your money coach. I explain, I model scenarios with your real numbers, and I keep you honest about your plan. I won't pick stocks, funds or coins for you." }]);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typing]);

  function send(text) {
    const t = (text ?? q).trim();
    if (!t) return;
    setMsgs((m) => [...m, { from: 'me', text: t }]);
    setQ('');
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, { from: 'coach', ...answer(t, store) }]); setTyping(false); }, 550);
  }

  return (
    <>
      <PageHead eyebrow="Ask Zvault" title={<>Ask <em>anything</em>.</>} sub="Type a question in your own words. Answers use your real numbers." />
      <section className="grid-3-1">
        <Reveal className="card chat">
          <div className="chat-log">
            {msgs.map((m, i) => (
              <div key={i} className={`msg msg-${m.from} ${m.guardrail ? 'msg-guard' : ''}`}>
                {m.guardrail && <span className="guard-tag"><Icon name="shield" size={13} /> Guardrail · no security picks</span>}
                {m.text.split('\n').map((l, k) => <p key={k}>{l.split(/\*(.+?)\*/).map((s, j) => (j % 2 ? <em key={j}>{s}</em> : s))}</p>)}
              </div>
            ))}
            {typing && <div className="msg msg-coach typing"><span /><span /><span /></div>}
            <div ref={end} />
          </div>
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How much can I save each month?" />
            <button className="btn btn-primary" aria-label="Send"><Icon name="arrow" /></button>
          </form>
        </Reveal>
        <div className="stack">
          <Reveal className="card" delay={80}>
            <h3>Try asking</h3>
            <div className="chips col">{SUGGEST.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
          </Reveal>
          <Reveal className="card guard-card" delay={160}>
            <h3><Icon name="shield" /> Guardrails</h3>
            <ul className="checks small">
              <li><Icon name="check" size={14} />Explains concepts: risk, diversification, fees, inflation</li>
              <li><Icon name="check" size={14} />Models scenarios with your data</li>
              <li><Icon name="x" size={14} />Never names stocks, funds, ETFs, coins or tickers to buy/sell</li>
              <li><Icon name="x" size={14} />No price targets or market timing</li>
            </ul>
            <p className="muted small">For investment selection, talk to a registered investment adviser.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
