'use client';
import {useState} from 'react';
import {useHealth} from '../health/use-health';
import {useHabits} from '../habits/use-habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {emptyMoods} from '../../lib/moods/schema';
import {healthGroupIn, withHealthGroup} from '../../lib/vault/w-homes';
import {defaultCurrency} from '../../lib/default-currency';
import {isShowcase} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import type {ImportBatch} from '../../lib/import/batches-schema';
import type {HabitsPlan} from '../../lib/import/switch/loop';
import type {DaylioPlan} from '../../lib/import/switch/daylio';
import type {YnabPlan, DateOrder} from '../../lib/import/switch/ynab';
import {n} from './switch-import-text';

/**
 * Session AK (A15): Daylio, Habitica and YNAB in "Switch to ZIGoals". Each export is read on this device into a preview;
 * nothing is written until the person confirms. Their imports are not listed in "Your imports on this device": that
 * ledger's app list is read strictly by earlier builds, so adding names to it would make it unreadable there. Instead,
 * "Undo this import" is offered right after each import, and removes exactly what that import added.
 */
type Undo = {label: string; run: () => Promise<void>};
const today = () => localDate(new Date());
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export default function SwitchImportMore() {
  const health = useHealth(), habits = useHabits(), journal = useDeviceRecord(JOURNAL), money = useDeviceRecord(MONEY_LOG);
  const [app, setApp] = useState<'daylio' | 'habitica' | 'ynab'>('daylio');
  const [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [undo, setUndo] = useState<Undo | null>(null);
  const [daylio, setDaylio] = useState<DaylioPlan | null>(null), [moodMap, setMoodMap] = useState<Record<string, number | null>>({}), [moodsToHealth, setMoodsToHealth] = useState(false);
  const [habitica, setHabitica] = useState<Omit<HabitsPlan, 'format'> | null>(null);
  const [ynabText, setYnabText] = useState(''), [currency, setCurrency] = useState<string>(() => defaultCurrency()), [order, setOrder] = useState<DateOrder | undefined>(), [ynab, setYnab] = useState<YnabPlan | null>(null);
  const ready = health.loaded && habits.loaded && journal.loaded && money.loaded;
  function reset() { setDaylio(null); setHabitica(null); setYnab(null); setYnabText(''); setError(''); }
  async function guarded(work: () => Promise<void>) {
    setBusy(true); setError(''); setStatus('');
    try { await work(); } catch (cause) { setError(`${cause instanceof Error && cause.message ? cause.message : 'The export could not be read.'} Nothing was changed.`); } finally { setBusy(false); }
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    if (isShowcase()) { setError('Showcase holds fictional records only, so imports are off here.'); return; }
    if (file.size > 30 * 1024 * 1024) { setError('This file is larger than 30 MB, more than these exports hold. Nothing was changed.'); return; }
    reset(); setUndo(null);
    await guarded(async () => {
      const text = await file.text();
      if (app === 'daylio') { const {readDaylio} = await import('../../lib/import/switch/daylio'); const plan = await readDaylio(text, {today: today()}); setDaylio(plan); setMoodMap(Object.fromEntries(plan.moods.map(m => [m.label, m.mapped]))); }
      else if (app === 'habitica') { const {readHabitica} = await import('../../lib/import/switch/habitica'); setHabitica(readHabitica(text, {now: Date.now(), zone: zone()})); }
      else { setYnabText(text); await readYnabNow(text, currency, undefined); }
    });
  }
  async function readYnabNow(text: string, cur: string, dateOrder: DateOrder | undefined) {
    const {readYnab} = await import('../../lib/import/switch/ynab');
    const plan = await readYnab(text, {currency: cur, today: today(), now: new Date(), dateOrder});
    setYnab(plan); setOrder(plan.dateOrder);
  }

  async function confirmDaylio(plan: DaylioPlan) {
    await guarded(async () => {
      const {daylioRecords, mergeDaylioMoods, mergeDaylioJournal} = await import('../../lib/import/switch/daylio');
      const records = daylioRecords(plan, {moodMap, zone: zone(), now: new Date()});
      let addedDays: string[] = [], addedEntries: string[] = [];
      if (records.journal.length) await journal.update(latest => { const have = new Set(latest.entries.map(e => e.id)); const r = mergeDaylioJournal(latest, records.journal); addedEntries = records.journal.filter(e => !have.has(e.id)).map(e => e.id); return r.next; });
      if (moodsToHealth && Object.keys(records.moods).length) await health.update(latest => {
        const current = healthGroupIn(latest, 'moods') ?? emptyMoods(), r = mergeDaylioMoods(current, records.moods);
        addedDays = Object.keys(records.moods).filter(d => !current.days[d] && r.next.days[d]);
        return withHealthGroup(latest, 'moods', r.next, false);
      });
      const days = addedDays, ids = new Set(addedEntries);
      setDaylio(null);
      setStatus(`Imported from Daylio: ${n(ids.size)} journal ${ids.size === 1 ? 'entry' : 'entries'}${moodsToHealth ? ` and ${n(days.length)} ${days.length === 1 ? 'day' : 'days'} of mood` : ''}.`);
      setUndo({label: 'Daylio', run: async () => {
        if (ids.size) await journal.update(latest => ({...latest, entries: latest.entries.filter(e => !ids.has(e.id))}));
        if (days.length) await health.update(latest => { const current = healthGroupIn(latest, 'moods') ?? emptyMoods(), next = {...current.days}; for (const d of days) delete next[d]; return withHealthGroup(latest, 'moods', {...current, days: next}, false); });
      }});
    });
  }
  async function confirmHabitica(plan: Omit<HabitsPlan, 'format'>) {
    await guarded(async () => {
      const {previewHabits, undoHabits} = await import('../../lib/import/switch/loop');
      let created: string[] = [], entries: [string, string][] = [];
      await habits.update(latest => { const r = previewHabits(latest, plan.habits); created = r.created; entries = r.entries; return r.next; });
      setHabitica(null);
      setStatus(`Imported from Habitica: ${n(created.length)} ${created.length === 1 ? 'habit' : 'habits'}.`);
      // The undo note lives in memory only (see the comment at the top); its shape is the one undoHabits reads.
      const note = {id: crypto.randomUUID(), format: 'loop', label: 'Habitica', at: new Date().toISOString(), counts: {}, refs: {habits: {habitIds: created, entries}}} as ImportBatch;
      setUndo({label: 'Habitica', run: async () => { await habits.update(latest => undoHabits(latest, note)); }});
    });
  }
  async function confirmYnab(plan: YnabPlan) {
    await guarded(async () => {
      const {mergeMoneyEntries} = await import('../../lib/import/switch/ynab');
      let added: string[] = [];
      await money.update(latest => { const have = new Set(latest.entries.map(e => e.id)); const r = mergeMoneyEntries(latest, plan.entries); added = plan.entries.filter(e => !have.has(e.id)).map(e => e.id); return r.next; });
      const ids = new Set(added);
      setYnab(null); setYnabText('');
      setStatus(`Imported from YNAB: ${n(ids.size)} ${ids.size === 1 ? 'entry' : 'entries'} in your money log.`);
      setUndo({label: 'YNAB', run: async () => { await money.update(latest => ({...latest, entries: latest.entries.filter(e => !ids.has(e.id))})); }});
    });
  }

  const own = daylio?.moods.filter(m => DAYLIO_DEFAULTS.indexOf(m.label.toLowerCase()) < 0) ?? [];
  return <div className="switch-more">
    <fieldset className="field" disabled={busy}>
      <legend>Which app</legend>
      {(['daylio', 'habitica', 'ynab'] as const).map(id => <label key={id} className="check"><input type="radio" name="switch-more-app" checked={app === id} onChange={() => { setApp(id); reset(); }} /> {APPS[id].label}</label>)}
    </fieldset>
    <p className="fine">{APPS[app].steps}</p>
    <label className="field import-file"><span>Choose the {APPS[app].file}</span>
      <input type="file" accept={APPS[app].accept} disabled={!ready || busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void readFile(file); }} /></label>

    {daylio && <div className="switch-preview">
      <p className="import-summary">Daylio: {n(daylio.entries.length)} {daylio.entries.length === 1 ? 'entry' : 'entries'} from {daylio.entries[0]?.date ?? '—'} to {daylio.entries.at(-1)?.date ?? '—'}.</p>
      {own.length > 0 && <div className="switch-moods"><p>Place your own mood words on the 1–5 scale (5 is best), or leave them out:</p>
        {own.map(m => <label key={m.label} className="field"><span>“{m.label}” ({n(m.count)})</span>
          <select value={moodMap[m.label] ?? ''} onChange={e => setMoodMap(map => ({...map, [m.label]: e.target.value ? Number(e.target.value) : null}))}><option value="">Leave out</option>{[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v}</option>)}</select></label>)}
      </div>}
      <label className="check"><input type="checkbox" checked={moodsToHealth} onChange={e => setMoodsToHealth(e.target.checked)} /> Add each day&apos;s mood to your Health journal (a day that already has a mood keeps yours)</label>
      <p className="fine">Notes become Journal entries, with their activities as tags. Daylio has no energy rating, so none is added.</p>
      {daylio.warnings.map(w => <p key={w} className="notice">{w}</p>)}
      <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void confirmDaylio(daylio)}>{busy ? 'Importing…' : 'Import from Daylio'}</button><button type="button" className="quiet" disabled={busy} onClick={reset}>Cancel</button></div>
    </div>}

    {habitica && <div className="switch-preview">
      <p className="import-summary">Habitica: {n(habitica.habits.length)} {habitica.habits.length === 1 ? 'habit' : 'habits'} ({habitica.habits.slice(0, 5).map(h => h.title).join(', ')}{habitica.habits.length > 5 ? '…' : ''}).</p>
      <p className="fine">Habits and dailies come in as habits with their schedule; to-dos and rewards stay in Habitica. ZIGoals never merges habits by name.</p>
      {[...habitica.summarised, ...habitica.warnings].map(w => <p key={w} className="notice">{w}</p>)}
      <div className="actions"><button type="button" className="primary" disabled={busy || !habitica.habits.length} onClick={() => void confirmHabitica(habitica)}>{busy ? 'Importing…' : `Import ${n(habitica.habits.length)} ${habitica.habits.length === 1 ? 'habit' : 'habits'}`}</button><button type="button" className="quiet" disabled={busy} onClick={reset}>Cancel</button></div>
    </div>}

    {ynab && <div className="switch-preview">
      <p className="import-summary">YNAB: {n(ynab.entries.length)} {ynab.entries.length === 1 ? 'entry' : 'entries'} for your money log{ynab.transfers ? ` · ${n(ynab.transfers)} transfers between your own accounts left out` : ''}.</p>
      <label className="field"><span>Currency of this plan</span><select value={currency} disabled={busy} onChange={e => { const cur = e.target.value; setCurrency(cur); void guarded(() => readYnabNow(ynabText, cur, order)); }}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      {ynab.ambiguousDates && <label className="field"><span>Dates in this file are</span><select value={order} disabled={busy} onChange={e => { const o = e.target.value as DateOrder; setOrder(o); void guarded(() => readYnabNow(ynabText, currency, o)); }}><option value="dmy">day / month / year</option><option value="mdy">month / day / year</option><option value="ymd">year / month / day</option></select></label>}
      {ynab.warnings.map(w => <p key={w} className="notice">{w}</p>)}
      <div className="actions"><button type="button" className="primary" disabled={busy || !ynab.entries.length} onClick={() => void confirmYnab(ynab)}>{busy ? 'Importing…' : 'Import into the money log'}</button><button type="button" className="quiet" disabled={busy} onClick={reset}>Cancel</button></div>
    </div>}

    {status && <p role="status">{status}</p>}
    {undo && <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => void guarded(async () => { await undo.run(); setUndo(null); setStatus(`The ${undo.label} import was undone.`); })}>Undo this import</button></div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
const DAYLIO_DEFAULTS = ['rad', 'good', 'meh', 'bad', 'awful'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'JPY'];
const APPS = {
  daylio: {label: 'Daylio (moods and notes)', file: 'Daylio CSV', accept: '.csv,text/csv', steps: 'Daylio → More → Export Entries → CSV, then share the file to this device.'},
  habitica: {label: 'Habitica (habits and dailies)', file: 'userdata.json', accept: '.json,application/json', steps: 'Habitica on the web → Settings → Site Data → Export → userdata.json.'},
  ynab: {label: 'YNAB (spending and income)', file: 'Register CSV', accept: '.csv,text/csv', steps: 'YNAB on the web → your plan’s name → Export Plan, then choose the Register file from the ZIP.'},
} as const;
