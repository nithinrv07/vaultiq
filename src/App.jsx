import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import { StoreProvider, useStore, useToast } from './store.jsx';
import { Icon } from './components/ui.jsx';
import { useInstall } from './pwa.js';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Import from './pages/Import.jsx';
import Transactions from './pages/Transactions.jsx';
import Recurring from './pages/Recurring.jsx';
import Profile from './pages/Profile.jsx';
import Planner from './pages/Planner.jsx';
import Review from './pages/Review.jsx';
import Coach from './pages/Coach.jsx';

const NAV = [
  ['dashboard', 'Home', 'home', Dashboard],
  ['import', 'Add statement', 'upload', Import],
  ['transactions', 'My spending', 'list', Transactions],
  ['recurring', 'Subscriptions & bills', 'repeat', Recurring],
  ['profile', 'My money & goals', 'user', Profile],
  ['planner', 'Plan ahead', 'sliders', Planner],
  ['review', 'Monthly report', 'report', Review],
  ['coach', 'Ask Zvault', 'chat', Coach],
];
const TABS = [['dashboard', 'Home', 'home'], ['transactions', 'Spending', 'list'], ['planner', 'Plan', 'sliders'], ['coach', 'Ask', 'chat']];

const parseHash = () => {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (h === 'login') return 'login';
  return h.startsWith('app') ? h.split('/')[1] || 'dashboard' : null;
};
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

function Shell() {
  const [page, setPage] = useState(() => parseHash() ?? (isStandalone() ? 'dashboard' : null));
  const [params, setParams] = useState({});
  const [menu, setMenu] = useState(false);
  const [toasts, toast] = useToast();
  const store = useStore();
  const auth = useAuth();
  const install = useInstall();

  useEffect(() => {
    const on = () => { setPage(parseHash()); setMenu(false); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page]);

  const go = (p, prm = {}) => { setParams(prm); window.location.hash = `#/app/${p}`; };
  const afterLogin = () => go(store.txs.length ? 'dashboard' : 'import');

  if (!page) {
    return <Landing
      enter={() => (auth.signedIn ? afterLogin() : (window.location.hash = '#/login'))}
      demo={() => {
        if (auth.user && store.txs.length) return go('dashboard'); // never overwrite a real account with demo data
        store.loadDemo(); if (!auth.signedIn) auth.continueAsGuest(); go('dashboard');
      }} />;
  }
  if (auth.loading) return <div className="boot"><span className="brand-mark big">Z</span><span className="spin dark" /></div>;
  if (page === 'login' || !auth.signedIn) return <Login onDone={afterLogin} />;

  const needsSetup = !store.profile.onboarded && !store.txs.length && !store.profile.monthlyIncome;
  if (needsSetup) return <Setup go={go} onSkip={() => store.setProfile({ onboarded: true })} />;

  const Page = (NAV.find((n) => n[0] === page) || NAV[0])[3];
  const alerts = store.nudges.filter((n) => n.level !== 'low').length;
  const flagged = store.recurring.filter((r) => r.alerts.length).length;
  const name = auth.user?.name || 'Guest';
  const syncLabel = { local: 'On this device only', loading: 'Loading your data…', saving: 'Saving…', synced: 'Synced', error: 'Sync paused — offline?' }[store.sync];

  return (
    <div className={`app ${menu ? 'menu-open' : ''}`}>
      <aside className="side">
        <a className="brand" href="#/"><span className="brand-mark">Z</span>Zvault</a>
        <nav>
          {NAV.map(([id, label, icon]) => (
            <a key={id} href={`#/app/${id}`} onClick={() => { setParams({}); setMenu(false); }} className={page === id ? 'on' : ''}>
              <Icon name={icon} />{label}
              {id === 'dashboard' && alerts > 0 && <span className="count">{alerts}</span>}
              {id === 'recurring' && flagged > 0 && <span className="count">{flagged}</span>}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          {install.canInstall && (
            <button className="install-btn" onClick={install.prompt}><Icon name="phone" size={16} />Install the app</button>
          )}
          {install.iosHint && (
            <div className="guard-mini"><Icon name="phone" size={16} /><span>On iPhone: tap Share, then “Add to Home Screen”.</span></div>
          )}
          <div className="account">
            {auth.user?.photo ? <img src={auth.user.photo} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{name[0]?.toUpperCase()}</span>}
            <div className="grow">
              <b>{name}</b>
              <span className={`sync sync-${store.sync}`}><i />{auth.user ? syncLabel : 'Guest · this device only'}</span>
            </div>
            <button className="icon-btn" title={auth.user ? 'Sign out' : 'Sign in'} onClick={async () => { await auth.signOut(); window.location.hash = '#/login'; }}>
              <Icon name={auth.user ? 'logout' : 'login'} size={17} />
            </button>
          </div>
          <div className="guard-mini"><Icon name="shield" size={16} /><span>Zvault explains and plans. It never tells you which stocks or funds to buy.</span></div>
        </div>
      </aside>
      <div className="mobile-bar">
        <a className="brand" href="#/"><span className="brand-mark">Z</span>Zvault</a>
        <div className="row gap-s">
          {auth.user?.photo ? <img className="mini-avatar" src={auth.user.photo} alt="" referrerPolicy="no-referrer" /> : null}
          <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Menu"><Icon name={menu ? 'x' : 'menu'} /></button>
        </div>
      </div>
      <main className="main" key={page}>
        <Page go={go} toast={toast} params={params} />
      </main>
      <nav className="tabbar">
        {TABS.map(([id, label, icon]) => (
          <a key={id} href={`#/app/${id}`} className={page === id ? 'on' : ''} onClick={() => setParams({})}>
            <Icon name={icon} size={21} /><span>{label}</span>
            {id === 'dashboard' && alerts > 0 && <i className="dot" />}
          </a>
        ))}
        <button className={!TABS.some((t) => t[0] === page) ? 'on' : ''} onClick={() => setMenu(true)}><Icon name="menu" size={21} /><span>More</span></button>
      </nav>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className="toast"><Icon name="check" size={16} /><div><b>{t.title}</b>{t.body && <p>{t.body}</p>}</div></div>)}
      </div>
    </div>
  );
}

function Root() {
  const { user } = useAuth();
  return <StoreProvider key={user?.uid || 'guest'} uid={user?.uid || null}><Shell /></StoreProvider>;
}

export default function App() {
  return <AuthProvider><Root /></AuthProvider>;
}
