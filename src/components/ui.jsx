import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, catColor } from '../lib/categories.js';
import { money } from '../lib/format.js';

/** Reveal-on-scroll wrapper. variant: up | left | right | scale | blur */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal reveal-${variant} ${shown ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>{children}</Tag>;
}

export function CountUp({ value, format = (v) => money(v), duration = 1100 }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    let raf, started = false;
    const run = () => {
      const start = performance.now(), a = from.current, b = Number(value) || 0;
      const tick = (t) => {
        const k = Math.min(1, (t - start) / duration);
        const e = 1 - Math.pow(1 - k, 4);
        setV(a + (b - a) * e);
        if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; run(); } }, { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className="num">{format(v)}</span>;
}

export function CatPill({ cat, small }) {
  return <span className={`pill ${small ? 'pill-sm' : ''}`} style={{ '--c': catColor(cat) }}><i />{cat}</span>;
}

export function CatSelect({ value, onChange, className = '' }) {
  return (
    <label className={`cat-select ${className}`} style={{ '--c': catColor(value) }}>
      <i />
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5" /></svg>
    </label>
  );
}

const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  upload: 'M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  brain: 'M9.5 2A2.5 2.5 0 0 0 7 4.5v0A2.5 2.5 0 0 0 4.5 7 2.5 2.5 0 0 0 3 11.5 3 3 0 0 0 5 17a3 3 0 0 0 4.5 2.6V2zM14.5 2A2.5 2.5 0 0 1 17 4.5 2.5 2.5 0 0 1 19.5 7a2.5 2.5 0 0 1 1.5 4.5A3 3 0 0 1 19 17a3 3 0 0 1-4.5 2.6V2z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5-6',
};
export function Icon({ name, size = 18, stroke = 1.8, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

export function Empty({ title, body, action }) {
  return (
    <div className="empty">
      <div className="empty-mark"><Icon name="leaf" size={26} /></div>
      <h3>{title}</h3>
      <p className="muted">{body}</p>
      {action}
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, right }) {
  return (
    <header className="page-head">
      <Reveal variant="up">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="display">{title}</h1>
        {sub && <p className="lede">{sub}</p>}
      </Reveal>
      {right && <Reveal variant="up" delay={120} className="page-head-right">{right}</Reveal>}
    </header>
  );
}
