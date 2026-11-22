'use client';
import {useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import type {MoneyLog} from '../../../lib/money-log/schema';
import {MONEY_RULES} from '../../../lib/money-rules/schema';
import {applyCategoryFile, categoryFile, categoryFileName, planCategoryFile, readCategoryFile, undoCategoryLog, undoCategoryRules, type CategoryFile as FileData} from '../../../lib/money-log/category-file';
import {saveFile} from '../../../lib/notes/doc-image';
import {localDate} from '../../../lib/local-date';
import {formatNumber} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import './money-r5.css';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's category backup and restore, LEDGER #390): inside "Your own
 * categories", its own chunk: "Save categories and rules" makes one small file of the person's own categories,
 * subcategories and rules (lib/money-log/category-file.ts); "Read categories and rules" reads one as data only, shows a
 * plan of what is new and what is already there, adds only what is new, with Undo. Nothing is removed or changed.
 */
type Update = (fn: (log: MoneyLog) => MoneyLog) => unknown;
const n = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;
export default function CategoryFile({log, update}: {log: MoneyLog; update: Update}) {
  const id = useId(), rules = useDeviceRecord(MONEY_RULES), [file, setFile] = useState<{name: string; data: FileData} | null>(null), [said, setSaid] = useState(''), [problem, setProblem] = useState(''), input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const plan = file && rules.loaded ? planCategoryFile(log, rules.unreadable ? null : rules.data, file.data) : null;
  const save = () => {
    const ruleCount = rules.loaded && !rules.unreadable ? rules.data.rules.length : 0, own = (log.own?.expense?.length ?? 0) + (log.own?.income?.length ?? 0), subs = Object.values(log.subs ?? {}).reduce((s, l) => s + l.length, 0);
    try { saveFile(categoryFile(log, rules.loaded && !rules.unreadable ? rules.data : null, new Date().toISOString()), categoryFileName(localDate()), 'application/json'); setProblem(''); setSaid(`Saved: ${n(own, 'category', 'categories')} of your own, ${n(subs, 'subcategory', 'subcategories')} and ${n(ruleCount, 'rule', 'rules')} — never an entry or an amount.`); }
    catch { setProblem('The file could not be made on this device.'); }
  };
  const read = async (picked: File | undefined) => {
    setSaid(''); setProblem(''); setFile(null);
    if (!picked) return;
    if (picked.size > 256 * 1024) { setProblem('That file is larger than a categories and rules file can be (256 KB). Nothing was read.'); return; }
    const out = readCategoryFile(await picked.text());
    if (!out.ok) { setProblem(out.problem); return; }
    setFile({name: picked.name, data: out.file});
  };
  const add = () => {
    if (!file || !plan || !plan.fresh) return;
    if (rules.unreadable) { setProblem('Your rules could not be read on this device, so nothing was added.'); return; }
    let result: ReturnType<typeof applyCategoryFile> | null = null;
    try {
      update(l => { result = applyCategoryFile(l, rules.data, file.data, () => crypto.randomUUID(), new Date().toISOString()); return result.log; });
      const r = result as ReturnType<typeof applyCategoryFile> | null;
      if (r && r.added.ruleIds.length) rules.update(current => ({...current, rules: [...current.rules, ...r.rules.rules.filter(x => r.added.ruleIds.includes(x.id))]}));
    } catch { setProblem('This could not be saved on this device. Nothing was changed.'); return; }
    const r = result as ReturnType<typeof applyCategoryFile> | null;
    if (!r) return;
    const words = `Added from ${file.name}: ${n(r.added.own.length, 'category', 'categories')}, ${n(r.added.subs.length, 'subcategory', 'subcategories')} and ${n(r.added.ruleIds.length, 'rule', 'rules')}.${r.full ? ` ${n(r.full, 'item was', 'items were')} past the limits and left out.` : ''} Nothing you had was changed.`;
    setSaid(words); setFile(null); if (input.current) input.current.value = '';
    requestAnimationFrame(() => heading.current?.focus());
    showUndo({message: words, undoLabel: 'Undo reading categories and rules', undone: 'What the file added is taken out again.', restore: () => { update(l => undoCategoryLog(l, r.added)); if (r.added.ruleIds.length) rules.update(current => undoCategoryRules(current, r.added)); }});
  };
  return <section aria-labelledby={`${id}-title`} className="category-more-part category-file">
    <h4 id={`${id}-title`} ref={heading} tabIndex={-1}>Categories and rules in a file</h4>
    <p className="fine">One small file of your own categories, subcategories and rules, to keep or to share — never an entry or an amount. Reading one adds only what is new; nothing you have is removed or changed.</p>
    <div className="money-actions"><button type="button" className="secondary" onClick={save}>Save categories and rules</button></div>
    <label className="field"><span>Read categories and rules from a file</span><input ref={input} type="file" accept=".json,application/json" onChange={e => void read(e.target.files?.[0])}/></label>
    {problem && <p role="alert">{problem}</p>}
    {file && plan && <div className="category-file-plan">
      <p className="fine">From {file.name}: {n(plan.fresh, 'new item', 'new items')}{file.data.dropped ? `; ${n(file.data.dropped, 'item', 'items')} this version cannot read left out` : ''}.</p>
      <ul className="category-more-preview" aria-label={`What ${file.name} adds`}>
        {plan.own.map(c => <li key={`o-${c.kind}-${c.name}`}><strong>{c.name}</strong> <span className="fine">{c.kind === 'income' ? 'money received' : 'spending'} · {c.isNew ? 'new' : 'already there'}</span></li>)}
        {plan.subs.map(s => <li key={`s-${s.category}-${s.name}`}><span>{s.category} › {s.name}</span> <span className="fine">{s.isNew ? 'new' : 'already there'}</span></li>)}
        {plan.rules.map((x, i) => <li key={`r-${i}`}><span>Rule: “{x.rule.text}”{x.rule.category ? ` → ${x.rule.category}` : ''}{x.rule.renameTo ? `, named ${x.rule.renameTo}` : ''}{x.rule.tag ? `, #${x.rule.tag}` : ''}</span> <span className="fine">{x.isNew ? 'new' : 'already there'}</span></li>)}
      </ul>
      <button type="button" className="secondary" aria-disabled={!plan.fresh || undefined} onClick={add}>{plan.fresh ? `Add ${n(plan.fresh, 'new item', 'new items')}` : 'All of it is already there'}</button>
    </div>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
