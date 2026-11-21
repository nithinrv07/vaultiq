import { useEffect, useState } from 'react';
import { StoreProvider, useStore, useToast } from './store.jsx';
import { Icon } from './components/ui.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Import from './pages/Import.jsx';
import Transactions from './pages/Transactions.jsx';
import Recurring from './pages/Recurring.jsx';
import Profile from './pages/Profile.jsx';
import Planner from './pages/Planner.jsx';
import Review from './pages/Review.jsx';
import Coach from './pages/Coach.jsx';

const NAV = [
  ['dashboard', 'Overview', 'home', Dashboard],
  ['import', 'Import', 'upload', Import],
  ['transactions', 'Transactions', 'list', Transactions],
  ['recurring', 'Recurring', 'repeat', Recurring],
  ['profile', 'Profile & goals', 'user', Profile],
  ['planner', 'What-if planner', 'sliders', Planner],
  ['review', 'Monthly review', 'report', Review],
  ['coach', 'Coach', 'chat', Coach],
];

const parseHash = () => {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path] = h.split('?');
  return path.startsWith('app') ? path.split('/')[1] || 'dashboard' : null;
};

function Shell() {
  const [page, setPage] = useState(parseHash());
  const [params, setParams] = useState({});
  const [menu, setMenu] = useState(false);
  const [toasts, toast] = useToast();
  const store = useStore();

  useEffect(() => {
    const on = () => { setPage(parseHash()); setMenu(false); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page]);

  const go = (p, prm = {}) => { setParams(prm); window.location.hash = `#/app/${p}`; };

  if (!page) return <Landing enter={() => go(store.txs.length ? 'dashboard' : 'import')} demo={() => { store.loadDemo(); go('dashboard'); }} />;

  const Page = (NAV.find((n) => n[0] === page) || NAV[0])[3];
  const alerts = store.nudges.filter((n) => n.level !== 'low').length;
  const flagged = store.recurring.filter((r) => r.alerts.length).length;

  return (
    <div className={`app ${menu ? 'menu-open' : ''}`}>
      <aside className="side">
        <a className="brand" href="#/"><span className="brand-mark"><Icon name="leaf" size={16} /></span>Evergreen</a>
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
          <div className="guard-mini"><Icon name="shield" size={16} /><span>Educational coach. Never recommends specific securities.</span></div>
        </div>
      </aside>
      <div className="mobile-bar">
        <a className="brand" href="#/"><span className="brand-mark"><Icon name="leaf" size={16} /></span>Evergreen</a>
        <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Menu"><Icon name={menu ? 'x' : 'menu'} /></button>
      </div>
      <main className="main" key={page}>
        <Page go={go} toast={toast} params={params} />
      </main>
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className="toast"><Icon name="check" size={16} /><div><b>{t.title}</b>{t.body && <p>{t.body}</p>}</div></div>)}
      </div>
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
