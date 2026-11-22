import { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { CatPill, Icon, PageHead, Reveal } from '../components/ui.jsx';
import { categorize } from '../lib/categories.js';
import { parseFile, parseText } from '../lib/parse.js';
import { SAMPLE_CSV, SAMPLE_SMS } from '../lib/sample.js';
import { longDate, money } from '../lib/format.js';

export default function Import({ go, toast }) {
  const { addTransactions, rules, txs, loadDemo } = useStore();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { name, transactions, warnings }
  const [text, setText] = useState('');
  const [tab, setTab] = useState('sms');
  const inputRef = useRef(null);
  const existing = new Set(txs.map((t) => t.id));

  async function handleFiles(files) {
    setBusy(true);
    const all = { name: [], transactions: [], warnings: [] };
    for (const f of files) {
      try {
        const r = await parseFile(f);
        all.name.push(f.name);
        all.transactions.push(...r.transactions);
        all.warnings.push(...r.warnings.map((w) => `${f.name}: ${w}`));
      } catch (e) {
        all.warnings.push(`${f.name}: could not be read (${e.message}).`);
      }
    }
    setBusy(false);
    show({ ...all, name: all.name.join(', ') });
  }
  function show(r) {
    setPreview({ ...r, transactions: r.transactions.map((t) => ({ ...t, ...categorize(t, rules), dup: existing.has(t.id) })) });
    setTimeout(() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function parsePasted() {
    if (!text.trim()) return;
    show({ name: tab === 'sms' ? 'Pasted SMS' : 'Pasted text', ...parseText(text) });
  }
  function commit() {
    const fresh = preview.transactions.filter((t) => !t.dup);
    addTransactions(fresh.map(({ dup, category, via, ...t }) => t));
    toast({ title: `Imported ${fresh.length} transactions`, body: preview.transactions.length - fresh.length ? `${preview.transactions.length - fresh.length} duplicates skipped.` : 'Categorised automatically — fix any and I\'ll learn.' });
    setPreview(null); setText('');
    go('transactions');
  }

  const newCount = preview?.transactions.filter((t) => !t.dup).length || 0;

  return (
    <>
      <PageHead eyebrow="Add statement" title={<>Add your <em>bank statement</em>.</>} sub="PDF statements, CSV exports from any bank, or a pile of transaction SMS. Everything is parsed in your browser — nothing is uploaded." />

      <section className="grid-1-1">
        <Reveal className={`card drop ${drag ? 'is-drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles([...e.dataTransfer.files]); }}
          onClick={() => inputRef.current?.click()}>
          <input ref={inputRef} type="file" accept=".pdf,.csv,.tsv,.txt" multiple hidden onChange={(e) => handleFiles([...e.target.files])} />
          <div className="drop-art">
            <span className="doc d1">PDF</span><span className="doc d2">CSV</span><span className="doc d3">TXT</span>
          </div>
          <h3>{busy ? 'Reading…' : 'Tap to choose a file'}</h3>
          <p className="muted">or drag it here · PDF or CSV from your bank's app or website</p>
          <ul className="checks small">
            <li><Icon name="check" size={14} />Header detection across 25 rows of bank preamble</li>
            <li><Icon name="check" size={14} />Debit/Credit columns, signed amounts or Dr/Cr flags</li>
            <li><Icon name="check" size={14} />DD/MM vs MM/DD inferred from your data</li>
            <li><Icon name="check" size={14} />PDF rows rebuilt from text layout, balance-checked</li>
          </ul>
        </Reveal>

        <Reveal className="card" delay={100}>
          <div className="tabs">
            <button className={tab === 'sms' ? 'on' : ''} onClick={() => setTab('sms')}><Icon name="phone" size={15} />Paste bank SMS</button>
            <button className={tab === 'csv' ? 'on' : ''} onClick={() => setTab('csv')}><Icon name="file" size={15} />Paste text</button>
          </div>
          <textarea className="paste" rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={tab === 'sms' ? 'Paste one or many SMS. Separate messages with a blank line.\n\nRs.450.00 debited from A/c XX4821 on 12-03-25 to VPA swiggy@icici…' : 'Date,Description,Amount\n03/12/2025,UBER TRIP,-245.00'} />
          <div className="row between wrap gap">
            <button className="link" onClick={() => setText(tab === 'sms' ? SAMPLE_SMS : SAMPLE_CSV)}>Show me an example</button>
            <button className="btn btn-primary" onClick={parsePasted} disabled={!text.trim()}>Read it <Icon name="arrow" size={16} /></button>
          </div>
        </Reveal>
      </section>

      {preview && (
        <Reveal id="preview" className="card preview">
          <div className="card-head">
            <div><h3>Preview · {preview.name}</h3><span className="muted small">{preview.transactions.length} found · {newCount} new</span></div>
            <div className="row gap">
              <button className="btn" onClick={() => setPreview(null)}>Discard</button>
              <button className="btn btn-primary" onClick={commit} disabled={!newCount}>Import {newCount}</button>
            </div>
          </div>
          {preview.warnings.map((w) => <p key={w} className="warn-line">⚠ {w}</p>)}
          {preview.transactions.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Source</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {preview.transactions.map((t) => (
                    <tr key={t.id + t.description} className={t.dup ? 'is-dup' : ''}>
                      <td className="nowrap">{longDate(t.date)}</td>
                      <td>{t.description}{t.dup && <span className="tag">duplicate</span>}</td>
                      <td><CatPill cat={t.category} small />{t.via === 'rule' && <span className="tag tag-ok">learned</span>}</td>
                      <td><span className="src">{t.source}</span></td>
                      <td className={`r num ${t.amount > 0 ? 'pos' : ''}`}>{money(t.amount, { decimals: 2, sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">Nothing recognisable. Try a different export, or paste the rows as text.</p>}
        </Reveal>
      )}

      {!txs.length && !preview && (
        <Reveal className="card demo-cta">
          <div><h3>Just looking around?</h3><p className="muted">Try Zvault with six months of sample spending and goals.</p></div>
          <button className="btn btn-primary" onClick={() => { loadDemo(); go('dashboard'); }}><Icon name="spark" />Try sample data</button>
        </Reveal>
      )}
    </>
  );
}
