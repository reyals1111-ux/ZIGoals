'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_MORE} from '../../../lib/money-more/schema';
import {ownBudgetIssue, ownBudgetRows, withOwnBudget, withoutOwnBudget, type OwnBudgetInput} from '../../../lib/money-more/own-budgets';
import {MONEY_TAGS_RECORD} from '../../../lib/money-tags/schema';
import {allTags, tagsOf} from '../../../lib/money-tags/tags';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {readMoneyAmount} from '../../../lib/money-log/form';
import {formatDate} from '../../../lib/visual-format';
import {removeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2, round 2 (money; Spendee's budgets by label, Wallet's one-time budgets): Budgets → "Your own
 * budgets", its own chunk. A budget on one tag (a trip, a renovation) in any category, or on chosen categories together,
 * each month or once between two days, with spent, left, days to go and about how much a day is left. Kept apart from the
 * monthly category budgets (an entry can count in both). From the person's own counted entries; never advice.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
export default function OwnBudgets({entries, today, currencies, categories, space = 'personal'}: {entries: readonly MoneyEntry[]; today: string; currencies: readonly string[]; categories: readonly string[]; space?: 'personal' | 'business'}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), tags = useDeviceRecord(MONEY_TAGS_RECORD), heading = useRef<HTMLHeadingElement>(null);
  const byTag = useMemo(() => { const out = new Map<string, Set<string>>(); for (const e of entries) for (const t of tagsOf(tags.data, e.id)) out.set(t, new Set([...(out.get(t) ?? []), e.id])); return out; }, [entries, tags.data]);
  const tagged = useMemo(() => (tag: string): ReadonlySet<string> => byTag.get(tag) ?? new Set<string>(), [byTag]);
  const rows = useMemo(() => space === 'personal' ? ownBudgetRows(more.data, entries, tagged, today) : [], [more.data, entries, tagged, today, space]);
  const tagList = useMemo(() => tags.loaded ? allTags(tags.data, entries) : [], [tags.loaded, tags.data, entries]);
  const [adding, setAdding] = useState(false), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const [draft, setDraft] = useState<OwnBudgetInput & {by: 'tag' | 'categories'; raw: string}>({name: '', currency: currencies[0] ?? 'EUR', amount: '', raw: '', by: tagList.length ? 'tag' : 'categories', categories: [], every: 'once', from: today, to: today});
  if (space !== 'personal' || !more.loaded || more.unreadable) return null;
  const set = (patch: Partial<typeof draft>) => { setDraft(d => ({...d, ...patch})); setProblem(''); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const input: OwnBudgetInput = {name: draft.name, currency: draft.currency, amount: readMoneyAmount(draft.raw) ?? draft.raw, every: draft.every, ...(draft.by === 'tag' ? (draft.tag ? {tag: draft.tag} : {}) : {categories: draft.categories ?? []}), ...(draft.every === 'once' ? {from: draft.from, to: draft.to} : {})};
    const issue = ownBudgetIssue(input); if (issue) { setProblem(issue); return; }
    try { more.update(m => withOwnBudget(m, input, `ob_${crypto.randomUUID().slice(0, 12)}`)); setStatus(`${input.name.trim()}: ${money(Math.round(Number(input.amount) * 100), input.currency)} ${input.every === 'month' ? 'each month' : `from ${formatDate(input.from!)} to ${formatDate(input.to!)}`}, saved.`); setAdding(false); setDraft(d => ({...d, name: '', raw: '', tag: undefined, categories: []})); requestAnimationFrame(() => heading.current?.focus()); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'Not saved on this device.'); }
  };
  const toggleCat = (c: string) => set({categories: draft.categories?.includes(c) ? draft.categories.filter(x => x !== c) : [...(draft.categories ?? []), c]});
  return <section className="budgets-watch budgets-own" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`} ref={heading} tabIndex={-1}>Your own budgets</h4>
    {rows.length ? <ul className="budgets-watch-list budgets-own-list">{rows.map(r => <li key={r.budget.id} data-over={r.over || undefined}>
      <span className="budgets-own-what"><strong>{r.budget.name}</strong> <span className="fine">· {r.budget.tag ? `tag “${r.budget.tag}”` : r.budget.categories!.join(', ')} · {r.budget.every === 'month' ? 'this month' : `${formatDate(r.from, {year: false})} – ${formatDate(r.to)}`}</span>
        <span className="budgets-bar" aria-hidden="true"><span style={{width: `${Math.round(r.share * 100)}%`}}/></span>
        <span className="fine budgets-own-figures">{money(r.spent, r.budget.currency)} of {money(r.amount, r.budget.currency)} · {r.over ? `${money(-r.left, r.budget.currency)} over` : `${money(r.left, r.budget.currency)} left`}
          {r.state === 'running' ? ` · ${r.daysLeft === 1 ? 'last day' : `${r.daysLeft} days to go`}${r.perDay !== null ? ` · about ${money(r.perDay, r.budget.currency)} a day` : ''}` : r.state === 'not-started' ? ` · starts in ${r.daysToStart} ${r.daysToStart === 1 ? 'day' : 'days'}` : ' · ended'}</span></span>
      <button type="button" className="quiet" aria-label={`Remove the budget ${r.budget.name}`} onClick={() => { const name = r.budget.name; void removeWithUndo(more.update, m => withoutOwnBudget(m, r.budget.id), `${name} removed.`, `${name} is back.`).then(() => { setStatus(`${name} removed.`); heading.current?.focus(); }, () => setProblem('Not saved on this device.')); }}>Remove</button>
    </li>)}</ul> : <p className="fine">A budget for a trip or a move: what carries one tag, or what falls in chosen categories, against an amount — each month, or once between two days. It sits beside your category budgets.</p>}
    {!adding ? <p><button type="button" className="secondary" aria-expanded={false} onClick={() => { setAdding(true); setStatus(''); }}>+ Add your own budget</button></p>
    : <form className="budgets-form budgets-own-form" onSubmit={save} aria-label="Add your own budget" noValidate>
      <label className="field"><span>Name</span><input value={draft.name} maxLength={40} autoComplete="off" placeholder="Holiday" onChange={e => set({name: e.target.value})}/></label>
      <label className="field"><span>Amount</span><input inputMode="decimal" autoComplete="off" value={draft.raw} placeholder="1200" onChange={e => set({raw: e.target.value})}/></label>
      {currencies.length > 1 && <label className="field"><span>Currency</span><select value={draft.currency} onChange={e => set({currency: e.target.value})}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <fieldset className="budgets-own-by"><legend>What counts</legend>
        <label className="budgets-check"><input type="radio" name={`${id}-by`} checked={draft.by === 'tag'} onChange={() => set({by: 'tag'})}/><span>Entries with a tag</span></label>
        <label className="budgets-check"><input type="radio" name={`${id}-by`} checked={draft.by === 'categories'} onChange={() => set({by: 'categories'})}/><span>Entries in chosen categories</span></label>
      </fieldset>
      {draft.by === 'tag' ? (tagList.length ? <label className="field"><span>Tag</span><select value={draft.tag ?? ''} onChange={e => set({tag: e.target.value || undefined})}><option value="">Choose…</option>{tagList.map(t => <option key={t.tag} value={t.tag}>{t.tag}</option>)}</select></label>
        : <p className="fine">No tags yet: add one to entries in Search all your entries → Select → Add a tag, or choose categories.</p>)
      : <fieldset className="budgets-own-cats"><legend>Categories</legend>{categories.map(c => <label key={c} className="budgets-check"><input type="checkbox" checked={!!draft.categories?.includes(c)} onChange={() => toggleCat(c)}/><span>{c}</span></label>)}</fieldset>}
      <fieldset className="budgets-own-by"><legend>When</legend>
        <label className="budgets-check"><input type="radio" name={`${id}-every`} checked={draft.every === 'once'} onChange={() => set({every: 'once'})}/><span>Once, between two days</span></label>
        <label className="budgets-check"><input type="radio" name={`${id}-every`} checked={draft.every === 'month'} onChange={() => set({every: 'month'})}/><span>Each month</span></label>
      </fieldset>
      {draft.every === 'once' && <div className="budgets-target-fields"><label className="field"><span>First day</span><input type="date" value={draft.from} onChange={e => set({from: e.target.value})}/></label><label className="field"><span>Last day</span><input type="date" value={draft.to} min={draft.from} onChange={e => set({to: e.target.value})}/></label></div>}
      {problem && <p role="alert">{problem}</p>}
      <div className="budgets-form-actions"><button type="submit" className="secondary">Save budget</button><button type="button" className="quiet" onClick={() => { setAdding(false); setProblem(''); }}>Cancel</button></div>
    </form>}
    <p className="fine" role="status">{status}</p>
  </section>;
}
