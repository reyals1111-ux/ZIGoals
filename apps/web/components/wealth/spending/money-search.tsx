'use client';
import {useId, useMemo, useRef, useState} from 'react';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {searchEntries, usedCategories, usedPayees, type MoneyQuery} from '../../../lib/money-log/search';
import {signedMoney, summarizeSelection} from '../../../lib/money-log/selection';
import {isCounted} from '../../../lib/money-log/counted';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {parseNumberInput} from '../../../lib/numbers/parse';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_TAGS_RECORD} from '../../../lib/money-tags/schema';
import {allTags, normaliseTag, setEntryTags, tagsOf} from '../../../lib/money-tags/tags';
import {PAID_WITH, PAID_WITH_WORDS, categoryPath} from '../../../lib/money-more/quick';
import {groupRows, type GroupSummary} from '../../../lib/money-log/groups';
import {MAX_GROUP} from '../../../lib/money-log/schema';
import {GroupItem} from './group-row';

/**
 * Session AV (owner follow-up 1, F-MONEY-SEARCH; Copilot, Monarch, YNAB): "Search all your entries" under Spending —
 * words, spending or income, a category and a date range across the whole money log, newest first, with the total of
 * what was found per currency (never converted). Each found entry opens the same edit form as the week's list. Lazy.
 * Session AV lane 2 (money; Monarch's exclude, payee and tag filters, Copilot's multi-select): words to leave out, one
 * payee, one tag, counted or left out, tax-deductible only — the total follows every filter — and "Select" to change the
 * category of several at once, leave them out of the figures, count them again or add a tag (each with Undo, through
 * the parent's `onBulk`). `initial` opens it on a category and month (the drill-down from "This month by category").
 */
const SHOWN = 100, money = (cents: number, currency: string) => moneyCents(cents, currency);
/** Session AV (fresh-agent check q2, rank 21): an amount field read as cents ("12,50" too); empty or unreadable: no limit. */
const toCents = (raw: string): number | undefined => { if (!raw.trim()) return undefined; const r = parseNumberInput(raw), n = Number(r.ok ? r.text : NaN); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined; };
/** Session AV lane 2, round 4 (money, LEDGER #341): `group` puts the selection in one named group; a refusal comes back in words. */
export type BulkAction = {kind: 'category'; category: string} | {kind: 'exclude'; out: boolean} | {kind: 'group'; name: string};
export default function MoneySearch({entries, onEdit, onBulk, onUngroup, categories = [], initial}: {entries: readonly MoneyEntry[]; onEdit: (e: MoneyEntry) => void; onBulk?: (ids: ReadonlySet<string>, action: BulkAction) => string | null | void; onUngroup?: (g: GroupSummary) => void; categories?: readonly string[]; initial?: Partial<MoneyQuery>}) {
  const id = useId(), [q, setQ] = useState<MoneyQuery>({text: '', kind: 'all', category: '', from: '', to: '', not: '', payee: '', counted: 'all', tax: false, paidWith: '', sub: '', ...initial}), [more, setMore] = useState(false);
  const [range, setRange] = useState({min: '', max: ''}), minCents = toCents(range.min), maxCents = toCents(range.max);
  const tags = useDeviceRecord(MONEY_TAGS_RECORD), [tag, setTag] = useState('');
  const unreadable = (range.min.trim() && minCents === undefined) || (range.max.trim() && maxCents === undefined);
  const subs = useMemo(() => [...new Set(entries.filter(e => e.sub && (!q.category || e.category === q.category)).map(e => e.sub!))].sort((a, b) => a.localeCompare(b)), [entries, q.category]);
  const cats = useMemo(() => usedCategories(entries), [entries]), payees = useMemo(() => usedPayees(entries), [entries]);
  const tagList = useMemo(() => tags.loaded ? allTags(tags.data, entries) : [], [tags.loaded, tags.data, entries]);
  const tagged = useMemo(() => tag && tags.loaded ? new Set(entries.filter(e => tagsOf(tags.data, e.id).includes(tag)).map(e => e.id)) : undefined, [tag, tags.loaded, tags.data, entries]);
  const asked = !!(q.text?.trim() || q.category || q.from || q.to || (q.kind && q.kind !== 'all') || minCents !== undefined || maxCents !== undefined || q.not?.trim() || q.payee || tag || (q.counted && q.counted !== 'all') || q.tax || q.paidWith || q.sub);
  const found = useMemo(() => asked ? searchEntries(entries, {...q, minCents, maxCents, ...(tagged ? {tagged} : {})}) : [], [asked, entries, q, minCents, maxCents, tagged]);
  // The total counts what the figures count: an entry left out is found and listed, but not added in.
  const sum = useMemo(() => summarizeSelection(found, found.filter(isCounted).map(e => e.id)), [found]);
  const leftOut = found.length - found.filter(isCounted).length;
  const set = (patch: Partial<MoneyQuery>) => { setQ(x => ({...x, ...patch})); setMore(false); };
  const totals = sum.totals.map(t => signedMoney(t.cents, t.currency, money));
  // Select mode on the results.
  const [selecting, setSelecting] = useState(false), [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set()), [bulkCat, setBulkCat] = useState(''), [bulkTag, setBulkTag] = useState(''), [note, setNote] = useState('');
  const pickedNow = useMemo(() => new Set(found.filter(e => picked.has(e.id)).map(e => e.id)), [found, picked]), selectButton = useRef<HTMLButtonElement>(null);
  const pickedSum = useMemo(() => summarizeSelection(found, pickedNow), [found, pickedNow]);
  const toggle = (entryId: string) => setPicked(c => { const n = new Set(c); if (!n.delete(entryId)) n.add(entryId); return n; });
  const run = (action: BulkAction, words: string) => { if (!pickedNow.size || !onBulk) return; const refused = onBulk(pickedNow, action); setNote(refused || words); if (!refused && action.kind === 'group') setGroupName(''); };
  const [groupName, setGroupName] = useState('');
  const addTag = () => {
    const clean = normaliseTag(bulkTag);
    if (!clean) { setNote('Type a tag: letters, digits, spaces, "-" or "_", at most 24.'); return; }
    try {
      const live = new Set(entries.map(e => e.id));
      tags.update(r => { let next = r; for (const entryId of pickedNow) { const had = tagsOf(next, entryId); if (!had.includes(clean) && had.length < 5) next = setEntryTags(next, entryId, [...had, clean], live); } return next; });
      setNote(`Tag “${clean}” added to ${formatNumber(pickedNow.size)} ${pickedNow.size === 1 ? 'entry' : 'entries'} (an entry that has five tags already keeps its own).`); setBulkTag('');
    } catch { setNote('The tag could not be saved on this device.'); }
  };
  const chooseCats = [...new Set([...categories, ...cats])];
  const shownFound = found.slice(0, more ? found.length : SHOWN);
  const item = (e: MoneyEntry) => <li key={e.id}>
      {selecting && <label className="money-select-check"><input type="checkbox" checked={pickedNow.has(e.id)} onChange={() => toggle(e.id)} aria-label={`Select ${e.category} ${e.amount} ${e.currency} on ${formatDate(e.date)}`}/></label>}
      <span className="spending-entry-what"><strong>{categoryPath(e)}</strong>{e.note && <span className="fine"> · {e.note}</span>}<span className="fine"> · {formatDate(e.date)}</span>{e.paidWith && <span className="fine"> · {PAID_WITH_WORDS[e.paidWith].en}</span>}{!isCounted(e) && <span className="money-mark"> · {e.transfer ? 'Transfer' : 'Left out'}</span>}{e.taxDeductible && <span className="money-mark"> · Tax-deductible</span>}</span>
      <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(Math.round(Number(e.amount) * 100), e.currency)}</span>
      <span className="spending-entry-actions"><button type="button" className="text-link spending-edit" aria-label={`Edit ${e.category} ${e.amount} ${e.currency} on ${e.date}`} onClick={() => onEdit(e)}>Edit</button></span>
    </li>;
  return <div className="money-search">
    <form className="money-search-form" role="search" aria-label="Search all your entries" onSubmit={e => e.preventDefault()}>
      <label className="field money-search-text"><span>Words or an amount</span><input type="search" value={q.text} autoComplete="off" enterKeyHint="search" placeholder="café, rent, 12.50" onChange={e => set({text: e.target.value})}/></label>
      <label className="field"><span>Kind</span><select value={q.kind} onChange={e => set({kind: e.target.value as MoneyQuery['kind']})}><option value="all">Spending and income</option><option value="expense">Spending</option><option value="income">Income</option></select></label>
      <label className="field"><span>Category</span><select value={q.category} onChange={e => set({category: e.target.value})}><option value="">Any category</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>From</span><input type="date" value={q.from} onChange={e => set({from: e.target.value})}/></label>
      <label className="field"><span>To</span><input type="date" value={q.to} onChange={e => set({to: e.target.value})}/></label>
      <label className="field"><span>Amount from</span><input inputMode="decimal" autoComplete="off" value={range.min} placeholder="0" aria-describedby={unreadable ? `${id}-range` : undefined} onChange={e => { setRange(r => ({...r, min: e.target.value})); setMore(false); }}/></label>
      <label className="field"><span>Amount up to</span><input inputMode="decimal" autoComplete="off" value={range.max} placeholder="any" aria-describedby={unreadable ? `${id}-range` : undefined} onChange={e => { setRange(r => ({...r, max: e.target.value})); setMore(false); }}/></label>
      {unreadable && <p id={`${id}-range`} className="fine money-search-range-note">Enter an amount as a number, for example 50 or 12.50; until then that limit is left out.</p>}
      <details className="money-search-more"><summary>More filters</summary>
        <div className="money-search-more-body">
          <label className="field"><span>Leave out entries with</span><input type="search" value={q.not} autoComplete="off" placeholder="transfer, refund" onChange={e => set({not: e.target.value})}/></label>
          <label className="field"><span>Payee</span><select value={q.payee} onChange={e => set({payee: e.target.value})}><option value="">Any payee</option>{payees.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className="field"><span>Tag</span><select value={tag} onChange={e => { setTag(e.target.value); setMore(false); }}><option value="">Any tag</option>{tagList.map(t => <option key={t.tag} value={t.tag}>{t.tag}</option>)}</select></label>
          <label className="field"><span>Show</span><select value={q.counted} onChange={e => set({counted: e.target.value as MoneyQuery['counted']})}><option value="all">Counted and left out</option><option value="counted">Only what counts</option><option value="left-out">Only what is left out</option></select></label>
          <label className="field"><span>Paid with</span><select value={q.paidWith} onChange={e => set({paidWith: e.target.value})}><option value="">Any way</option>{PAID_WITH.map(p => <option key={p} value={p}>{PAID_WITH_WORDS[p].en}</option>)}<option value="unmarked">Not said</option></select></label>
          {subs.length > 0 && <label className="field"><span>Subcategory</span><select value={q.sub} onChange={e => set({sub: e.target.value})}><option value="">Any subcategory</option>{subs.map(x => <option key={x} value={x}>{x}</option>)}</select></label>}
          <label className="money-search-check"><input type="checkbox" checked={!!q.tax} onChange={e => set({tax: e.target.checked})}/><span>Only marked tax-deductible</span></label>
        </div>
      </details>
    </form>
    <p id={`${id}-total`} className="money-select-total" aria-live="polite">{!asked ? `Type a word or choose a filter to search all ${formatNumber(entries.length)} entries.` : found.length ? `${formatNumber(found.length)} found · ${totals.length === 0 ? 'nothing counted' : totals.length === 1 ? totals[0] : `${totals.length} currencies: ${totals.slice(0, -1).join(', ')} and ${totals.at(-1)}`}${totals.length > 1 ? ', each on its own, never converted' : ''}${leftOut ? ` (${formatNumber(leftOut)} left out of the figures, not added in)` : ''}` : 'Nothing found. Fewer words, or a wider date range, find more.'}</p>
    {found.length > 0 && onBulk && <div className="money-select-head money-search-select">
      <button ref={selectButton} type="button" className="quiet" aria-pressed={selecting} onClick={() => { setSelecting(v => !v); setPicked(new Set()); setNote(''); }}>Select</button>
      {selecting && <button type="button" className="quiet" onClick={() => setPicked(pickedNow.size === found.length ? new Set() : new Set(found.map(e => e.id)))}>{pickedNow.size === found.length ? 'Clear' : `Select all ${formatNumber(found.length)}`}</button>}
    </div>}
    {selecting && <div className="money-bulk" role="group" aria-label="Change the selected entries">
      <p className="money-select-total" aria-live="polite">{pickedNow.size ? `${formatNumber(pickedNow.size)} selected · ${pickedSum.totals.map(t => signedMoney(t.cents, t.currency, money)).join(', ')}` : 'Nothing selected'}</p>
      <div className="money-bulk-row">
        <label className="field"><span>New category</span><select value={bulkCat} onChange={e => setBulkCat(e.target.value)}><option value="">Choose…</option>{chooseCats.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <button type="button" className="secondary" disabled={!pickedNow.size || !bulkCat} onClick={() => run({kind: 'category', category: bulkCat}, `${formatNumber(pickedNow.size)} ${pickedNow.size === 1 ? 'entry' : 'entries'} moved to ${bulkCat}.`)}>Change category</button>
      </div>
      <div className="money-bulk-row">
        <label className="field"><span>Add a tag</span><input value={bulkTag} maxLength={24} autoComplete="off" placeholder="holiday" onChange={e => setBulkTag(e.target.value)}/></label>
        <button type="button" className="secondary" disabled={!pickedNow.size || !bulkTag.trim()} onClick={addTag}>Add tag</button>
      </div>
      <div className="money-bulk-row">
        <label className="field"><span>Group them as one, named</span><input value={groupName} maxLength={40} autoComplete="off" placeholder="Weekend in Ghent" onChange={e => setGroupName(e.target.value)}/></label>
        <button type="button" className="secondary" aria-disabled={pickedNow.size < 2 || pickedNow.size > MAX_GROUP || !groupName.trim() || undefined} onClick={() => { if (pickedNow.size < 2) { setNote('Select at least two entries to group.'); return; } if (pickedNow.size > MAX_GROUP || !groupName.trim()) { setNote(groupName.trim() ? `A group holds up to ${MAX_GROUP} entries.` : 'Give the group a name, for example Weekend in Ghent.'); return; } run({kind: 'group', name: groupName}, `${formatNumber(pickedNow.size)} entries grouped as ${groupName.trim()}: one line in your lists, each still counted on its own.`); }}>Group</button>
      </div>
      {pickedNow.size > MAX_GROUP && <p className="fine">A group holds up to {MAX_GROUP} entries.</p>}
      <div className="money-bulk-row">
        <button type="button" className="secondary" disabled={!pickedNow.size} onClick={() => run({kind: 'exclude', out: true}, `${formatNumber(pickedNow.size)} left out of your spending, budgets and insights; still in your log.`)}>Leave out of my spending</button>
        <button type="button" className="quiet" disabled={!pickedNow.size} onClick={() => run({kind: 'exclude', out: false}, `${formatNumber(pickedNow.size)} counted again.`)}>Count again</button>
      </div>
      <p className="money-status" role="status">{note}</p>
    </div>}
    {found.length > 0 && <ul className="spending-entries money-search-results" aria-label="Entries found">{(selecting ? shownFound.map(entry => ({kind: 'entry' as const, entry})) : groupRows(shownFound, entries)).map(row => row.kind === 'entry' ? item(row.entry) : <GroupItem key={`g-${row.group.id}`} group={row.group} shown={row.shown} entry={item} money={money} {...(onUngroup ? {onUngroup} : {})}/>)}</ul>}
    {found.length > SHOWN && !more && <p><button type="button" className="secondary" onClick={() => setMore(true)}>Show all {formatNumber(found.length)}</button></p>}
  </div>;
}
