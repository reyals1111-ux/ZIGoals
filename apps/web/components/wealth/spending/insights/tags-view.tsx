'use client';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {addLocalDays} from '../../../../lib/local-date';
import {monthOf} from '../../../../lib/money-log/engine';
import type {MoneyEntry} from '../../../../lib/money-log/schema';
import {minorUnits} from '../../../../lib/money-split/parts';
import {MAX_TAGS_PER_ENTRY, MAX_TAG_LENGTH, MONEY_TAGS_RECORD} from '../../../../lib/money-tags/schema';
import {allTags, parseTags, setEntryTags, tagTotals, tagsOf} from '../../../../lib/money-tags/tags';
import {formatDate} from '../../../../lib/visual-format';
import type {InsightProps} from './spending-insights';
import {money} from './format';

/**
 * Session AP (feature 2): tags on money entries, kept in their own device record (`zigoals:money-tags:v1`), never on the
 * entry itself. Filter the entries by a tag and see totals per tag, each currency apart. Only entries the money log still
 * holds are listed or counted, so a removed entry's tags never show.
 */
type Period = 'month' | '90' | 'all';
const PERIODS: Record<Period, string> = {month: 'This month', '90': 'Last 90 days', all: 'All records'};
const PAGE = 20;
export default function TagsView({entries, today}: InsightProps) {
  const id = useId(), record = useDeviceRecord(MONEY_TAGS_RECORD);
  const [period, setPeriod] = useState<Period>('month'), [picked, setTag] = useState<string | null>(null), [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null), [draft, setDraft] = useState(''), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const from = period === 'month' ? monthOf(today).start : period === '90' ? addLocalDays(today, -89) : '0000-01-01';
  const inPeriod = useMemo(() => entries.filter(e => e.date >= from && e.date <= today), [entries, from, today]);
  const tags = useMemo(() => allTags(record.data, entries), [record.data, entries]);
  // A tag whose last entry was removed is no longer offered, and no longer filters.
  const tag = picked && tags.some(t => t.tag === picked) ? picked : null;
  const totals = useMemo(() => tagTotals(entries, record.data, from, today), [entries, record.data, from, today]);
  const listed = useMemo(() => inPeriod.filter(e => !tag || tagsOf(record.data, e.id).includes(tag)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [inPeriod, tag, record.data]);
  // The tag field takes the cursor when it opens.
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) field.current?.focus(); }, [editing]);
  const live = useMemo(() => new Set(entries.map(e => e.id)), [entries]);
  // Closing the tag form puts the cursor back on that entry's Tags button.
  const back = (entryId: string) => requestAnimationFrame(() => document.getElementById(`${id}-tags-${entryId}`)?.focus());
  const startEdit = (e: MoneyEntry) => { setEditing(e.id); setDraft(tagsOf(record.data, e.id).join(', ')); setProblem(''); setStatus(''); };
  const save = (event: FormEvent, e: MoneyEntry) => {
    event.preventDefault();
    const parsed = parseTags(draft);
    if (!parsed.ok) return setProblem(parsed.problem);
    try { record.update(current => setEntryTags(current, e.id, parsed.tags, live)); }
    catch (cause) { return setProblem(cause instanceof Error ? cause.message : 'This could not be saved on this device. Nothing was changed.'); }
    setEditing(null); setProblem(''); back(e.id);
    setStatus(parsed.tags.length ? `Tags saved for ${e.category} on ${formatDate(e.date)}: ${parsed.tags.join(', ')}.` : `Tags removed from ${e.category} on ${formatDate(e.date)}.`);
  };
  if (!record.loaded) return <p className="fine" role="status">Loading your tags…</p>;
  return <div className="money-insights-currency">
    {record.unreadable && <p role="alert">This device&rsquo;s tags could not be read; nothing was changed. Saving a tag starts a fresh list.</p>}
    <label className="field"><span>Period</span><select value={period} onChange={e => { setPeriod(e.target.value as Period); setShown(PAGE); }}>{(Object.keys(PERIODS) as Period[]).map(p => <option key={p} value={p}>{PERIODS[p]}</option>)}</select></label>
    {tags.length > 0 ? <div className="money-tags-filter" role="group" aria-label="Show entries tagged">
      <button type="button" className="quiet" aria-pressed={tag === null} onClick={() => { setTag(null); setShown(PAGE); }}>All entries</button>
      {tags.map(t => <button key={t.tag} type="button" className="quiet" aria-pressed={tag === t.tag} onClick={() => { setTag(tag === t.tag ? null : t.tag); setShown(PAGE); }}>{t.tag} <span className="fine">({t.entries})</span></button>)}
    </div> : <p className="fine">No tags yet. Choose Tags beside an entry below to add up to {MAX_TAGS_PER_ENTRY}, such as &ldquo;holiday&rdquo; or &ldquo;work&rdquo;.</p>}
    {totals.length > 0 && <table className="money-insights-table">
      <caption>Totals per tag, {PERIODS[period].toLowerCase()}; each currency on its own</caption>
      <thead><tr><th scope="col">Tag</th><th scope="col">Spent</th><th scope="col">Received</th><th scope="col">Entries</th></tr></thead>
      <tbody>{totals.filter(t => !tag || t.tag === tag).map(t => <tr key={`${t.tag}-${t.currency}`}><th scope="row">{t.tag} <span className="fine">· {t.currency}</span></th><td>{money(t.spent, t.currency)}</td><td>{money(t.received, t.currency)}</td><td>{t.entries}</td></tr>)}</tbody>
    </table>}
    <h4 id={`${id}-list`}>{tag ? `Entries tagged “${tag}”` : 'Entries'} · {PERIODS[period].toLowerCase()}</h4>
    {listed.length ? <ul className="money-tags-list" aria-labelledby={`${id}-list`}>{listed.slice(0, shown).map(e => {
      const own = tagsOf(record.data, e.id), open = editing === e.id, label = `${e.category} ${e.amount} ${e.currency} on ${formatDate(e.date)}`;
      return <li key={e.id}>
        <span className="money-tags-what"><strong>{e.category}</strong>{e.note && <span className="fine"> · {e.note}</span>}<span className="fine"> · {formatDate(e.date)}</span>
          {own.length > 0 && <span className="money-tags-chips"><br/>{own.map(t => <span key={t} className="money-tags-chip">{t}</span>)}</span>}</span>
        <span className="spending-amount">{e.kind === 'income' ? '+' : '−'}{money(minorUnits(e.amount), e.currency)}</span>
        <button type="button" className="quiet" id={`${id}-tags-${e.id}`} aria-expanded={open} aria-label={`Tags for ${label}`} onClick={() => open ? setEditing(null) : startEdit(e)}>Tags</button>
        {open && <form onSubmit={event => save(event, e)} aria-label={`Tags for ${label}`}>
          <label className="field"><span>Tags, separated by commas (up to {MAX_TAGS_PER_ENTRY}, each up to {MAX_TAG_LENGTH} characters)</span><input value={draft} onChange={x => setDraft(x.target.value)} autoComplete="off" maxLength={200} placeholder="holiday, work" ref={field}/></label>
          {problem && <p role="alert">{problem}</p>}
          <div className="money-tags-actions"><button type="submit" className="secondary">Save tags</button><button type="button" className="quiet" onClick={() => { setEditing(null); setProblem(''); back(e.id); }}>Cancel</button></div>
        </form>}
      </li>;
    })}</ul> : <p className="fine">{tag ? `No entries tagged “${tag}” in this period.` : 'Nothing logged in this period.'}</p>}
    {listed.length > shown && <button type="button" className="quiet" onClick={() => setShown(n => n + PAGE)}>Show {Math.min(PAGE, listed.length - shown)} more</button>}
    <p className="spending-status" role="status" aria-live="polite">{status}</p>
    <p className="fine">Tags are kept on this device, apart from your entries, and are in Export everything. Removing an entry removes it from every tag.</p>
  </div>;
}
