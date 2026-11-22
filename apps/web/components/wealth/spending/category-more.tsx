'use client';
import {Suspense, lazy, useId, useMemo, useState} from 'react';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {allCategories} from '../../../lib/money-log/counted';
import {archiveCategory, archivedOf, entriesIn, isArchived, unarchiveCategory} from '../../../lib/money-log/category';
import {applyStarterSet, previewStarterSet, removeStarterAdds, STARTER_SETS, type StarterLang} from '../../../lib/money-log/starter-sets';
import {formatNumber} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import './money-r4.css';
// Session AV lane 2, round 5 (money; PocketSmith, LEDGER #390): categories and rules in a file (its own chunk).
const CategoryFile = lazy(() => import('./category-file'));

/**
 * Session AV lane 2, round 4 (money; Lunch Money's archived categories and category template library, LEDGER #342,
 * #347): inside "Your own categories", in its own chunk (loaded when that fold opens):
 * - "Archive a category": any category of the kind shown leaves the pickers; its entries keep it and reports and search
 *   still show it; "Bring back" offers it again. Kept on the space's own money log (`archived`).
 * - "Start from a set": four written starter sets (a student, a household, a freelancer, a traveller), in English or
 *   Dutch, previewed (what is new here, what is already there), then added in one tap, with Undo. Nothing already there
 *   is changed.
 */
type Update = (fn: (log: MoneyLog) => MoneyLog) => unknown;
export default function CategoryMore({log, update, kind, onArchived}: {log: MoneyLog; update: Update; kind: MoneyEntry['kind']; onArchived?: (name: string) => void}) {
  const id = useId(), [pick, setPick] = useState(''), [note, setNote] = useState('');
  const [setId, setSetId] = useState<string>(STARTER_SETS[0]!.id), [lang, setLang] = useState<StarterLang>('en'), [setNote2, setSetNote] = useState('');
  const visible = allCategories(log, kind).filter(c => !isArchived(log, kind, c)), archived = archivedOf(log, kind);
  const chosen = visible.includes(pick) ? pick : '';
  const words = kind === 'expense' ? 'spending' : 'money received';
  const archive = () => {
    if (!chosen) { setNote('Choose a category to archive.'); return; }
    try {
      update(l => archiveCategory(l, kind, chosen));
      const n = entriesIn(log.entries, kind, chosen);
      setNote(`${chosen} archived: it is no longer offered for ${words}. ${n ? `Its ${formatNumber(n)} ${n === 1 ? 'entry keeps' : 'entries keep'} it, and` : 'Your'} reports and search still show it.`);
      setPick(''); onArchived?.(chosen);
    } catch (e) { setNote(e instanceof Error ? e.message : 'This could not be saved on this device.'); }
  };
  const bringBack = (name: string) => { try { update(l => unarchiveCategory(l, kind, name)); setNote(`${name} is offered again.`); } catch { setNote('This could not be saved on this device.'); } };
  const set = STARTER_SETS.find(s => s.id === setId)!;
  const preview = useMemo(() => previewStarterSet(log, set, lang), [log, set, lang]);
  const fresh = preview.filter(c => c.isNew).length + preview.reduce((n, c) => n + c.subs.filter(s => s.isNew).length, 0);
  const addSet = () => {
    let out: ReturnType<typeof applyStarterSet> | null = null;
    try { update(l => { out = applyStarterSet(l, set, lang); return out.log; }); } catch { setSetNote('This could not be saved on this device. Nothing was changed.'); return; }
    const r = out as ReturnType<typeof applyStarterSet> | null;
    if (!r) return;
    const said = r.categories || r.subs
      ? `Added from ${set.title[lang]}: ${formatNumber(r.categories)} ${r.categories === 1 ? 'category' : 'categories'} and ${formatNumber(r.subs)} ${r.subs === 1 ? 'subcategory' : 'subcategories'}.${r.skipped ? ` ${formatNumber(r.skipped)} already there, kept as they were.` : ''}${r.full ? ` ${formatNumber(r.full)} not added: the list is full.` : ''}`
      : `Everything in ${set.title[lang]} is already there; nothing was changed.`;
    setSetNote(said);
    if (r.categories || r.subs) showUndo({message: said, undoLabel: `Undo adding ${set.title.en}`, undone: 'Starter set taken out again.', restore: () => { update(l => removeStarterAdds(l, r.added)); }});
  };
  return <div className="category-more">
    <section aria-labelledby={`${id}-arch`} className="category-more-part">
      <h4 id={`${id}-arch`}>Archive a category</h4>
      <p className="fine">An archived category is no longer offered for {words}, in budgets or in To review. Your entries keep it, and reports and search still show it.</p>
      <div className="spending-own-row"><label className="field"><span>Category</span><select value={chosen} onChange={e => setPick(e.target.value)}><option value="">Choose…</option>{visible.map(c => <option key={c} value={c}>{c}</option>)}</select></label><button type="button" className="secondary" onClick={archive}>Archive</button></div>
      {archived.length > 0 && <><p className="fine category-more-sub">Archived categories ({formatNumber(archived.length)})</p><ul className="spending-own-list" aria-label="Archived categories">{archived.map(c => <li key={c}><span>{c}</span><button type="button" className="text-link" aria-label={`Bring back ${c}`} onClick={() => bringBack(c)}>Bring back</button></li>)}</ul></>}
      <p className="fine" role="status">{note}</p>
    </section>
    <section aria-labelledby={`${id}-sets`} className="category-more-part">
      <h4 id={`${id}-sets`}>Start from a set</h4>
      <p className="fine">Four written starter sets of categories and subcategories. See what each adds, then add it in one tap; nothing already there is changed.</p>
      <div className="spending-own-row">
        <label className="field"><span>Set</span><select value={setId} onChange={e => { setSetId(e.target.value); setSetNote(''); }}>{STARTER_SETS.map(s => <option key={s.id} value={s.id}>{s.title.en}</option>)}</select></label>
        <label className="field"><span>Names in</span><select value={lang} onChange={e => { setLang(e.target.value as StarterLang); setSetNote(''); }}><option value="en">English</option><option value="nl">Nederlands</option></select></label>
      </div>
      <p className="fine">{set.about[lang]}</p>
      <ul className="category-more-preview" aria-label={`What ${set.title.en} adds`}>{preview.map(c => <li key={`${c.kind}-${c.name}`}>
        <strong>{c.name}</strong> <span className="fine">{c.kind === 'income' ? 'money received' : 'spending'}{c.isNew ? ' · new' : ' · already there'}</span>
        {c.subs.length > 0 && <span className="fine category-more-subs">{c.subs.map(s => `${s.name}${s.isNew ? '' : ' (already there)'}`).join(', ')}</span>}
      </li>)}</ul>
      <button type="button" className="secondary" aria-disabled={!fresh || undefined} onClick={() => { if (fresh) addSet(); }}>{fresh ? `Add ${formatNumber(fresh)} new from this set` : 'All of it is already there'}</button>
      <p className="fine" role="status">{setNote2}</p>
    </section>
    <Suspense fallback={null}><CategoryFile log={log} update={update}/></Suspense>
  </div>;
}
