'use client';
import {useEffect, useId, useMemo, useState, type FormEvent} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import type {MoneyLog} from '../../../lib/money-log/schema';
import {applyChanges, categoriesFor, describeRule, moveRule, previewPast, removeRule, ruleIssue, saveRule, undoChanges, type RuleChange, type RuleDraft} from '../../../lib/money-rules/engine';
import {MAX_RULES, RULE_DIRECTIONS, RULE_FIELDS, RULE_OPS, type MoneyRule, type MoneyRules} from '../../../lib/money-rules/schema';
import {plainErrorMessage} from '../../../lib/plain-error';
import {useMoneyGoals} from './use-money-goals';
import {money} from './format';

/**
 * Session AK (lane M, item 1): the transaction rules — the list in order (the first that matches wins), a form to add
 * or change one, and "Apply to the past 90 days" with a preview of every change and Undo. Rules also run on new
 * entries from the Spending form and on every import. Plain text matching only. Lazy-loaded by Money tools.
 */
const EMPTY: RuleDraft = {field: 'payee', op: 'contains', text: '', direction: 'out'};
const FIELD_LABEL: Record<MoneyRule['field'], string> = {either: 'Payee or memo', payee: 'Payee', memo: 'Memo'};
const OP_LABEL: Record<MoneyRule['op'], string> = {contains: 'contains', equals: 'is exactly', 'starts-with': 'starts with'};
const DIR_LABEL: Record<MoneyRule['direction'], string> = {any: 'Money in or out', out: 'Money out', in: 'Money in'};
const readAmount = (raw: string) => raw.trim().replace(/\s/g, '').replace(',', '.');
type Form = {field: MoneyRule['field']; op: MoneyRule['op']; text: string; direction: MoneyRule['direction']; min: string; max: string; category: string; renameTo: string; tag: string; goalId: string};
const toForm = (d: RuleDraft): Form => ({field: d.field, op: d.op, text: d.text, direction: d.direction, min: d.min ?? '', max: d.max ?? '', category: d.category ?? '', renameTo: d.renameTo ?? '', tag: d.tag ?? '', goalId: d.goalId ?? ''});
const toDraft = (f: Form): RuleDraft => ({field: f.field, op: f.op, text: f.text, direction: f.direction, ...(f.min.trim() ? {min: readAmount(f.min)} : {}), ...(f.max.trim() ? {max: readAmount(f.max)} : {}), ...(f.category ? {category: f.category} : {}), ...(f.renameTo.trim() ? {renameTo: f.renameTo} : {}), ...(f.tag.trim() ? {tag: f.tag.trim().replace(/^#/, '').toLowerCase()} : {}), ...(f.goalId ? {goalId: f.goalId} : {})});

export default function RulesPanel({rules, log, prefill, onPrefillUsed}: {rules: DeviceRecordState<MoneyRules>; log: DeviceRecordState<MoneyLog>; prefill: RuleDraft | null; onPrefillUsed: () => void}) {
  const id = useId(), today = localDate(), {goals, nameOf} = useMoneyGoals();
  const [form, setForm] = useState<Form>(() => toForm(prefill ?? EMPTY)), [editing, setEditing] = useState<string | null>(null);
  const [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const [preview, setPreview] = useState<RuleChange[] | null>(null), [applied, setApplied] = useState<RuleChange[] | null>(null);
  useEffect(() => { if (!prefill) return; queueMicrotask(() => { setForm(toForm(prefill)); setEditing(null); setStatus('A rule from this entry is filled in below. Check it, then save.'); onPrefillUsed(); }); }, [prefill, onPrefillUsed]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({...f, [key]: value}));
  const list = rules.data.rules;
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem(''); setStatus('');
    const draft = toDraft(form), issue = ruleIssue(draft);
    if (issue) return setProblem(issue);
    try { rules.update(r => saveRule(r, draft, editing ?? crypto.randomUUID(), new Date(), !!editing)); }
    catch (cause) { return setProblem(plainErrorMessage(cause, 'The rule could not be saved on this device.')); }
    setStatus(editing ? 'Rule changed.' : 'Rule saved. It runs on new entries and imports from now on.'); setEditing(null); setForm(toForm(EMPTY)); setPreview(null);
  };
  const change = (fn: (r: MoneyRules) => MoneyRules, words: string) => { try { rules.update(fn); setStatus(words); setPreview(null); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not saved on this device.')); } };
  const runPreview = () => { setApplied(null); setStatus(''); setPreview(previewPast(log.data, list, today)); };
  const apply = () => {
    if (!preview) return;
    try {
      let done: RuleChange[] = [];
      log.update(current => { const out = applyChanges(current, preview); done = out.applied; return out.log; });
      setApplied(done); setPreview(null); setStatus(`${done.length} ${done.length === 1 ? 'entry' : 'entries'} changed.`);
    } catch (cause) { setProblem(plainErrorMessage(cause, 'Nothing was changed on this device.')); }
  };
  const undo = () => {
    if (!applied) return;
    try { let n = 0; log.update(current => { const out = undoChanges(current, applied); n = out.restored; return out.log; }); setApplied(null); setStatus(`Undone: ${n} ${n === 1 ? 'entry is' : 'entries are'} back as before.`); }
    catch (cause) { setProblem(plainErrorMessage(cause, 'The change could not be undone.')); }
  };
  const describe = (r: MoneyRule) => describeRule(r, nameOf);
  const goalName = useMemo(() => (gid?: string) => gid ? nameOf(gid) ?? 'a Goal' : '', [nameOf]);
  if (!rules.loaded || !log.loaded) return <p className="fine">Loading…</p>;
  if (rules.unreadable) return <p role="alert">This device&rsquo;s rules could not be read, so none run now. Their bytes are kept.</p>;
  return <section className="money-panel" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Rules ({list.length} of {MAX_RULES})</h4>
    <p className="fine">A rule sets the category, a new name, a tag or a Goal for entries whose payee or memo matches your text. The first rule that matches wins. Plain text only; letters are matched without regard to capitals.</p>
    {list.length ? <ol className="money-list money-rules">{list.map((r, i) => { const d = describe(r); return <li key={r.id} className={r.enabled === false ? 'money-rule-off' : undefined}>
      <span className="money-rule-text"><strong>{i + 1}.</strong> {d.when} → {d.then}{r.enabled === false && <span className="fine"> · switched off</span>}</span>
      <span className="money-row-actions">
        <button type="button" className="quiet" disabled={i === 0} onClick={() => change(x => moveRule(x, r.id, -1), 'Moved up.')} aria-label={`Move rule ${i + 1} up`}>↑</button>
        <button type="button" className="quiet" disabled={i === list.length - 1} onClick={() => change(x => moveRule(x, r.id, 1), 'Moved down.')} aria-label={`Move rule ${i + 1} down`}>↓</button>
        <button type="button" className="quiet" onClick={() => { setEditing(r.id); setForm(toForm(r)); setStatus(`Changing rule ${i + 1}.`); }} aria-label={`Change rule ${i + 1}`}>Change</button>
        <button type="button" className="quiet" onClick={() => change(x => ({...x, rules: x.rules.map(y => y.id === r.id ? {...y, enabled: y.enabled === false} : y)}), r.enabled === false ? 'Switched on.' : 'Switched off.')} aria-label={`${r.enabled === false ? 'Switch on' : 'Switch off'} rule ${i + 1}`}>{r.enabled === false ? 'Switch on' : 'Switch off'}</button>
        <button type="button" className="quiet" onClick={() => change(x => removeRule(x, r.id), `Rule ${i + 1} removed.`)} aria-label={`Remove rule ${i + 1}`}>Remove</button>
      </span>
    </li>; })}</ol> : <p className="fine">No rules yet. For example: payee contains &ldquo;corner grocery&rdquo; → Groceries.</p>}

    <form className="money-form" onSubmit={save} aria-label={editing ? 'Change the rule' : 'Add a rule'}>
      <fieldset className="money-fieldset"><legend>When</legend>
        <div className="money-grid">
          <label className="field"><span>Look in</span><select value={form.field} onChange={e => set('field', e.target.value as Form['field'])}>{RULE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABEL[f]}</option>)}</select></label>
          <label className="field"><span>Match</span><select value={form.op} onChange={e => set('op', e.target.value as Form['op'])}>{RULE_OPS.map(o => <option key={o} value={o}>{OP_LABEL[o]}</option>)}</select></label>
          <label className="field money-wide"><span>Text</span><input value={form.text} maxLength={80} onChange={e => set('text', e.target.value)} placeholder="corner grocery"/></label>
          <label className="field"><span>Direction</span><select value={form.direction} onChange={e => set('direction', e.target.value as Form['direction'])}>{RULE_DIRECTIONS.map(d => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}</select></label>
          <label className="field"><span>From amount — optional</span><input inputMode="decimal" value={form.min} onChange={e => set('min', e.target.value)}/></label>
          <label className="field"><span>Up to amount — optional</span><input inputMode="decimal" value={form.max} onChange={e => set('max', e.target.value)}/></label>
        </div>
      </fieldset>
      <fieldset className="money-fieldset"><legend>Then</legend>
        <div className="money-grid">
          <label className="field"><span>Category</span><select value={form.category} onChange={e => set('category', e.target.value)}><option value="">Leave as it is</option>{[...new Set([...(form.category ? [form.category] : []), ...categoriesFor(form.direction)])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="field"><span>Rename the payee to — optional</span><input value={form.renameTo} maxLength={80} onChange={e => set('renameTo', e.target.value)}/></label>
          <label className="field"><span>Tag — optional</span><input value={form.tag} maxLength={25} onChange={e => set('tag', e.target.value)} placeholder="holiday"/></label>
          <label className="field"><span>Goal — optional</span><select value={form.goalId} onChange={e => set('goalId', e.target.value)}><option value="">No Goal</option>{form.goalId && !goals.some(g => g.id === form.goalId) && <option value={form.goalId}>{goalName(form.goalId)}</option>}{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        </div>
      </fieldset>
      {problem && <p role="alert">{problem}</p>}
      <div className="money-actions"><button type="submit" className="primary">{editing ? 'Save the change' : 'Save rule'}</button>{editing && <button type="button" className="quiet" onClick={() => { setEditing(null); setForm(toForm(EMPTY)); }}>Cancel</button>}</div>
    </form>

    {list.length > 0 && <div className="money-past">
      <button type="button" className="secondary" onClick={runPreview}>Apply to the past 90 days…</button>
      {preview && (preview.length ? <>
        <p className="fine">{preview.length} {preview.length === 1 ? 'entry' : 'entries'} would change. Nothing changes until you apply.</p>
        <div className="money-table-wrap"><table className="money-table"><caption className="visually-hidden">What the rules would change</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Now</th><th scope="col">After</th></tr></thead>
          <tbody>{preview.slice(0, 100).map(c => <tr key={c.id}><td>{formatDate(c.before.date)}</td><td>{money(c.before.amount, c.before.currency)}</td>
            <td>{c.before.category}{c.before.note ? ` · ${c.before.note}` : ''}</td>
            <td>{c.after.category}{c.after.note ? ` · ${c.after.note}` : ''}{c.after.parts?.length === 1 && c.after.parts[0]!.goalId ? ` · Goal ${goalName(c.after.parts[0]!.goalId)}` : ''}</td></tr>)}</tbody></table></div>
        {preview.length > 100 && <p className="fine">The first 100 are shown; all {preview.length} are applied.</p>}
        <div className="money-actions"><button type="button" className="primary" onClick={apply}>Apply to {preview.length} {preview.length === 1 ? 'entry' : 'entries'}</button><button type="button" className="quiet" onClick={() => setPreview(null)}>Cancel</button></div>
      </> : <p className="fine">Your rules would change nothing in the past 90 days.</p>)}
    </div>}
    <p className="money-status" role="status" aria-live="polite">{status}{applied && applied.length > 0 && <> <button type="button" className="text-link" onClick={undo}>Undo</button></>}</p>
  </section>;
}
