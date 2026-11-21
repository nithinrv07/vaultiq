import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/ui.jsx';
import { emailSignIn, friendlyAuthError, resetPassword, signInWithGoogle } from '../lib/firebase.js';

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

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
    try { await fn(); onDone?.(); }
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

          <button className="btn-google" disabled={!configured || !!busy} onClick={() => run('google', signInWithGoogle)}>
            {busy === 'google' ? <span className="spin" /> : <GoogleG />} Continue with Google
          </button>

          <div className="or"><span>or use email</span></div>

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
