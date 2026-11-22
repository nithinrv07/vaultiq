import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Icon } from '../components/ui.jsx';
import { addMonths, money, uid, ymd } from '../lib/format.js';

const GOALS = [
  ['Emergency savings', 'shield'],
  ['A trip', 'spark'],
  ['A new phone or laptop', 'phone'],
  ['A home', 'home'],
  ['Something else', 'target'],
];
const WHEN = [[6, '6 months'], [12, '1 year'], [24, '2 years'], [60, '5 years']];

const num = (v) => Math.max(0, Number(String(v).replace(/[^\d]/g, '')) || 0);

/** Three easy questions for first-time users, then a choice of how to add data. */
export default function Setup({ go, onSkip }) {
  const { setProfile, loadDemo } = useStore();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [rent, setRent] = useState('');
  const [bills, setBills] = useState('');
  const [saved, setSaved] = useState('');
  const [goal, setGoal] = useState('');
  const [goalAmt, setGoalAmt] = useState('');
  const [when, setWhen] = useState(12);

  function finish(next) {
    const fixed = [];
    if (num(rent)) fixed.push({ id: uid(), name: 'Rent / home loan', amount: num(rent), category: 'Housing' });
    if (num(bills)) fixed.push({ id: uid(), name: 'Electricity, phone & internet', amount: num(bills), category: 'Utilities' });
    const goals = goal && goal !== 'Emergency savings' && num(goalAmt)
      ? [{ id: uid(), name: goal === 'Something else' ? 'My goal' : goal, target: num(goalAmt), saved: 0, date: ymd(addMonths(new Date(), when)) }]
      : [];
    setProfile((p) => ({
      onboarded: true,
      monthlyIncome: num(income) || p.monthlyIncome,
      fixedCosts: fixed.length ? fixed : p.fixedCosts,
      emergencyFund: { ...p.emergencyFund, current: num(saved) },
      goals: goals.length ? goals : p.goals,
    }));
    next();
  }

  const steps = [
    {
      q: 'How much money do you get each month?',
      hint: 'Your salary or income after tax. A rough number is fine.',
      body: <MoneyInput value={income} onChange={setIncome} placeholder="50,000" autoFocus />,
      ok: num(income) > 0,
    },
    {
      q: 'What are your regular bills?',
      hint: 'Things you pay every month. Leave blank if you don\'t have them.',
      body: (
        <div className="setup-fields">
          <label>Rent or home loan<MoneyInput value={rent} onChange={setRent} placeholder="15,000" autoFocus /></label>
          <label>Electricity, phone & internet<MoneyInput value={bills} onChange={setBills} placeholder="2,500" /></label>
          <label>Savings you already have<MoneyInput value={saved} onChange={setSaved} placeholder="0" /></label>
        </div>
      ),
      ok: true,
    },
    {
      q: 'What are you saving for?',
      hint: 'Pick one. You can add more later.',
      body: (
        <>
          <div className="setup-choices">
            {GOALS.map(([g, ic]) => (
              <button key={g} className={`setup-choice ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}><Icon name={ic} size={20} />{g}</button>
            ))}
          </div>
          {goal && goal !== 'Emergency savings' && (
            <div className="setup-fields reveal-quick">
              <label>How much do you need?<MoneyInput value={goalAmt} onChange={setGoalAmt} placeholder="60,000" autoFocus /></label>
              <div className="setup-when">
                <span>By when?</span>
                <div>{WHEN.map(([m, l]) => <button key={m} className={`chip-s ${when === m ? 'on' : ''}`} onClick={() => setWhen(m)}>{l}</button>)}</div>
              </div>
              {num(goalAmt) > 0 && <p className="setup-tip"><Icon name="target" size={16} />That's about <b>{money(num(goalAmt) / when)}</b> a month.</p>}
            </div>
          )}
          {goal === 'Emergency savings' && <p className="setup-tip"><Icon name="shield" size={16} />Great choice. Zvault will help you build 6 months of bills as safety money.</p>}
        </>
      ),
      ok: !!goal,
    },
  ];

  if (step === steps.length) {
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="setup-done"><Icon name="check" size={30} /></div>
          <h1>You're all set!</h1>
          <p className="muted">Now let's see where your money goes. Add a bank statement, or look around with sample data first.</p>
          <div className="setup-actions col">
            <button className="btn btn-primary btn-big" onClick={() => finish(() => go('import'))}><Icon name="upload" />Add my bank statement</button>
            <button className="btn btn-big" onClick={() => { loadDemo(); setProfile({ onboarded: true }); go('dashboard'); }}><Icon name="spark" />Try with sample data</button>
            <button className="link" onClick={() => finish(() => go('dashboard'))}>I'll do it later</button>
          </div>
        </div>
      </div>
    );
  }

  const s = steps[step];
  return (
    <div className="setup">
      <div className="setup-card" key={step}>
        <div className="setup-top">
          <div className="setup-dots">{steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
          <button className="link small" onClick={onSkip}>Skip</button>
        </div>
        <span className="eyebrow">Step {step + 1} of {steps.length}</span>
        <h1>{s.q}</h1>
        <p className="muted">{s.hint}</p>
        <div className="setup-body">{s.body}</div>
        <div className="setup-actions">
          {step > 0 && <button className="btn btn-big" onClick={() => setStep(step - 1)}>Back</button>}
          <button className="btn btn-primary btn-big grow" disabled={!s.ok} onClick={() => setStep(step + 1)}>Next <Icon name="arrow" /></button>
        </div>
      </div>
    </div>
  );
}

function MoneyInput({ value, onChange, ...rest }) {
  return (
    <div className="money-input">
      <span>₹</span>
      <input inputMode="numeric" value={value ? Number(num(value)).toLocaleString('en-IN') : ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
