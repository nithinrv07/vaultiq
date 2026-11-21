import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/ui.jsx';
import { emailSignIn, friendlyAuthError, resetPassword } from '../lib/cloud.js';

export default function Login({ onDone }) {
  const { configured, continueAsGuest } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | create
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function run(kind, fn) {
    setError(''); setNote(''); setBusy(kind);
    try {
      const r = await fn();
      if (r === 'confirm') { setNote('Check your inbox and tap the confirmation link, then sign in.'); setMode('signin'); return; }
      onDone?.();
    }
    catch (e) { setError(friendlyAuthError(e)); }
    finally { setBusy(''); }
  }

  async function forgot() {
    setError(''); setNote('');
    if (!email.trim()) { setError('Enter your email first, then tap Forgot.'); return; }
    try { await resetPassword(email.trim()); setNote('Check your inbox for a password reset link.'); }
    catch (e) { setError(friendlyAuthError(e)); }
  }

  return (
    <div className="login">
      <aside className="login-art">
        <div className="login-orb" />
        <a className="brand" href="#/"><span className="brand-mark">Z</span>Zvault</a>
        <div className="login-pitch">
          <h1>Your money,<br /><em>one living model.</em></h1>
          <ul>
            <li><Icon name="upload" size={18} />Import PDF, CSV and bank SMS</li>
            <li><Icon name="sliders" size={18} />Ask “what if?” and watch goals move</li>
            <li><Icon name="bell" size={18} />Nudges before spending drifts</li>
            <li><Icon name="phone" size={18} />Synced across phone and laptop</li>
          </ul>
        </div>
        <div className="login-chips" aria-hidden>
          <span className="lchip c1"><i style={{ background: '#e8734a' }} />Dining −30% <b>Goal 2 mo sooner</b></span>
          <span className="lchip c2"><i style={{ background: '#8b5cf6' }} />Netflix ₹499 → ₹649</span>
          <span className="lchip c3"><i style={{ background: '#2f9e6b' }} />Saved this month <b>₹41,900</b></span>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <a className="brand brand-dark login-mobile-brand" href="#/"><span className="brand-mark">Z</span>Zvault</a>
          <span className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Get started'}</span>
          <h2>{mode === 'signin' ? 'Sign in to Zvault' : 'Create your account'}</h2>
          <p className="muted">Your data syncs securely to your account, so it's there on every device.</p>

          {!configured && (
            <div className="login-warn"><Icon name="shield" size={16} /><span>Account sign-in hasn't been configured for this deployment yet. You can continue as a guest — your data stays on this device.</span></div>
          )}

          <form className="login-form" onSubmit={(e) => { e.preventDefault(); run('email', () => emailSignIn(email.trim(), password, mode === 'create')); }}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={!configured} /></label>
            <label>
              <span className="row between">Password{mode === 'signin' && configured && <button type="button" className="link small" onClick={forgot}>Forgot?</button>}</span>
              <input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={!configured} />
            </label>
            {error && <p className="login-error">{error}</p>}
            {note && <p className="login-note">{note}</p>}
            <button className="btn btn-primary btn-block" disabled={!configured || !!busy}>{busy === 'email' ? <span className="spin" /> : null}{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          </form>

          <p className="login-switch">
            {mode === 'signin' ? 'New to Zvault?' : 'Already have an account?'}{' '}
            <button className="link" onClick={() => { setMode(mode === 'signin' ? 'create' : 'signin'); setError(''); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button>
          </p>

          <button className="guest" onClick={() => { continueAsGuest(); onDone?.(); }}>Continue as guest <Icon name="arrow" size={15} /></button>
          <p className="fine">Educational tool, not financial advice. Guests keep data only on this device.</p>
        </div>
      </main>
    </div>
  );
}
