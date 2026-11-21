import { useState } from 'react';
import { money } from '../lib/format.js';

export function Donut({ data, size = 200, thickness = 26, center }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const gap = data.length > 1 ? 2 : 0;
          const el = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color}
              strokeWidth={hover === i ? thickness + 6 : thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-seg" style={{ '--len': C, animationDelay: `${i * 60}ms` }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="donut-center">
        {h ? (<><span className="eyebrow">{h.label}</span><strong>{money(h.value)}</strong><span className="muted small">{((h.value / total) * 100).toFixed(0)}%</span></>) : center}
      </div>
    </div>
  );
}

export function CashflowBars({ data, height = 220 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.spend]));
  const W = 600, H = height, pad = 28, bw = (W - pad) / data.length;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="chart" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}><line x1={pad} x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} stroke="var(--line)" strokeDasharray="3 5" /></g>
        ))}
        {data.map((d, i) => {
          const x = pad + i * bw + bw * 0.18;
          const w = bw * 0.28;
          const hi = (d.income / max) * (H - 10), hs = (d.spend / max) * (H - 10);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.45}>
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <rect className="bar-grow" style={{ animationDelay: `${i * 70}ms` }} x={x} y={H - hi} width={w} height={hi} rx={5} fill="var(--forest)" />
              <rect className="bar-grow" style={{ animationDelay: `${i * 70 + 35}ms` }} x={x + w + 4} y={H - hs} width={w} height={hs} rx={5} fill="var(--coral)" />
              <text x={pad + i * bw + bw / 2} y={H + 18} textAnchor="middle" className="axis">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad + hover * bw + bw / 2) / W) * 100}%` }}>
          <b>{data[hover].label}</b>
          <span><i style={{ background: 'var(--forest)' }} />In {money(data[hover].income)}</span>
          <span><i style={{ background: 'var(--coral)' }} />Out {money(data[hover].spend)}</span>
          <span className="muted">Net {money(data[hover].income - data[hover].spend, { sign: true })}</span>
        </div>
      )}
    </div>
  );
}

export function ProjectionChart({ base, scenario, height = 260, markers = [] }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = height, padL = 8, padB = 22;
  const n = base.length;
  const max = Math.max(1, ...base.map((p) => p.total), ...(scenario || []).map((p) => p.total)) * 1.05;
  const X = (i) => padL + (i / (n - 1)) * (W - padL * 2);
  const Y = (v) => H - padB - (v / max) * (H - padB - 10);
  const path = (s) => s.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.total).toFixed(1)}`).join(' ');
  const area = (s) => `${path(s)} L${X(n - 1)},${H - padB} L${X(0)},${H - padB} Z`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))); }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gBase" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--forest)" stopOpacity=".22" /><stop offset="1" stopColor="var(--forest)" stopOpacity="0" /></linearGradient>
          <linearGradient id="gScn" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--lime-deep)" stopOpacity=".35" /><stop offset="1" stopColor="var(--lime-deep)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={Y(max * f)} y2={Y(max * f)} stroke="var(--line)" strokeDasharray="3 6" />)}
        {base.filter((_, i) => i % 12 === 11).map((p) => { const i = p.m - 1; return <text key={i} x={X(i)} y={H - 6} textAnchor="middle" className="axis">{`Yr ${(i + 1) / 12}`}</text>; })}
        <path d={area(base)} fill="url(#gBase)" />
        <path d={path(base)} fill="none" stroke="var(--forest)" strokeWidth="2.2" className="line-draw" />
        {scenario && <><path d={area(scenario)} fill="url(#gScn)" /><path d={path(scenario)} fill="none" stroke="var(--lime-deep)" strokeWidth="2.6" strokeDasharray="1 0" className="line-draw" /></>}
        {markers.map((mk) => mk.m && mk.m <= n ? <g key={mk.label}><line x1={X(mk.m - 1)} x2={X(mk.m - 1)} y1={10} y2={H - padB} stroke={mk.color} strokeDasharray="2 4" /><circle cx={X(mk.m - 1)} cy={Y((scenario || base)[mk.m - 1].total)} r="4.5" fill={mk.color} stroke="var(--card)" strokeWidth="2" /></g> : null)}
        {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={0} y2={H - padB} stroke="var(--ink)" strokeOpacity=".25" />}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(X(hover) / W) * 100}%` }}>
          <b>Month {hover + 1}</b>
          <span><i style={{ background: 'var(--forest)' }} />Now {money(base[hover].total, { compact: true })}</span>
          {scenario && <span><i style={{ background: 'var(--lime-deep)' }} />What-if {money(scenario[hover].total, { compact: true })}</span>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, width = 120, height = 34, color = 'var(--forest)' }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 4 - ((v - min) / span) * (height - 8)]);
  return (
    <svg width={width} height={height} className="spark">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill={color} />
    </svg>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = 'var(--forest)', children }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${v * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc" style={{ '--len': C }} />
      </svg>
      <div className="ring-c">{children}</div>
    </div>
  );
}

export function Meter({ value, max, color = 'var(--forest)' }) {
  const p = max ? Math.min(1.25, value / max) : 0;
  return (
    <div className={`meter ${p > 1 ? 'over' : p > 0.85 ? 'warn' : ''}`}>
      <div className="meter-fill" style={{ width: `${Math.min(100, p * 100)}%`, background: p > 1 ? 'var(--coral)' : color }} />
    </div>
  );
}
