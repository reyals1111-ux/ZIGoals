'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {fiIssue, runFiModel, type FiInput} from '../../../lib/fi-model/model';
import {MAX_LIFE_EVENTS, MAX_SCENARIOS, type FiModelRecord} from '../../../lib/fi-model/store';
import {parseNumberInput} from '../../../lib/numbers/parse';
import {money} from './format';

/**
 * Session AV lane 2 (money; Monarch's forecast scenarios and life events): under "Financial freedom" — life events (an
 * amount in or out in a year of the model, once or every year from then) that the model counts, and up to four saved
 * scenarios shown side by side (the middle path's years to the target and the share of paths that reach it), each one
 * opened back into the form or removed. Still a model from the person's own figures, never a promise. Lazy.
 */
type Event = NonNullable<FiModelRecord['events']>[number];
type Scenario = NonNullable<FiModelRecord['scenarios']>[number];
const num = (raw: string) => { const r = parseNumberInput(raw); return r.ok ? r.value : Number.NaN; };
const newId = (p: string) => `${p}_${crypto.randomUUID().slice(0, 12)}`;
const NONE_EVENTS: Event[] = [], NONE_SCENARIOS: Scenario[] = [];
const yearsWord = (n: number | null) => n === null ? 'not within the years shown' : `${n} ${n === 1 ? 'year' : 'years'}`;
export default function FiScenarios({stored, input, currency, onOpen}: {stored: DeviceRecordState<FiModelRecord>; input: FiInput; currency: string; onOpen: (inputs: Record<string, unknown>) => void}) {
  const id = useId(), events = stored.data.events ?? NONE_EVENTS, scenarios = stored.data.scenarios ?? NONE_SCENARIOS;
  const [title, setTitle] = useState(''), [year, setYear] = useState('5'), [amount, setAmount] = useState(''), [kind, setKind] = useState<'in' | 'out'>('out'), [every, setEvery] = useState<'once' | 'yearly'>('once');
  const [name, setName] = useState(''), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const save = (fn: (r: FiModelRecord) => FiModelRecord, words: string) => { setProblem(''); try { stored.update(fn); setStatus(words); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not kept on this device.'); } };
  const addEvent = (e: FormEvent) => {
    e.preventDefault();
    const y = Math.round(num(year)), a = num(amount);
    if (!title.trim()) { setProblem('Name the event, for example “New car”.'); return; }
    if (!(y >= 1 && y <= 60)) { setProblem('Choose a year of the model from 1 to 60.'); return; }
    if (!(a > 0 && a <= 1e12)) { setProblem('Enter the amount above zero.'); return; }
    if (events.length >= MAX_LIFE_EVENTS) { setProblem(`Up to ${MAX_LIFE_EVENTS} life events.`); return; }
    const ev: Event = {id: newId('ev'), title: title.trim().slice(0, 60), year: y, amount: a, kind, every};
    save(r => ({...r, events: [...(r.events ?? []), ev]}), `${ev.title} added: ${kind === 'in' ? 'in' : 'out'} ${money(a.toFixed(0), currency)} in year ${y}${every === 'yearly' ? ' and every year after' : ''}.`); setTitle(''); setAmount('');
  };
  const saveScenario = (e: FormEvent) => {
    e.preventDefault();
    if (fiIssue(input)) { setProblem('Fix the figures above first; then the scenario can be saved.'); return; }
    if (!name.trim()) { setProblem('Name the scenario, for example “Part time from 50”.'); return; }
    if (scenarios.length >= MAX_SCENARIOS) { setProblem(`Up to ${MAX_SCENARIOS} scenarios; remove one first.`); return; }
    const {events: _e, paths: _p, seed: _s, ...inputs} = input; void _e; void _p; void _s;
    const sc: Scenario = {id: newId('sc'), name: name.trim().slice(0, 40), inputs: {...inputs, currency}, ...(events.length ? {events: events.map(x => ({...x}))} : {})};
    save(r => ({...r, scenarios: [...(r.scenarios ?? []), sc]}), `Scenario “${sc.name}” saved.`); setName('');
  };
  const results = useMemo(() => scenarios.map(sc => {
    const i = sc.inputs as Partial<FiInput> & {currency?: string}, run: FiInput = {invested: Number(i.invested), yearlySpend: Number(i.yearlySpend), withdrawalPct: Number(i.withdrawalPct), monthlyContribution: Number(i.monthlyContribution), returnPct: Number(i.returnPct), volatilityPct: Number(i.volatilityPct), years: Number(i.years), events: sc.events ?? []};
    return {sc, currency: i.currency ?? currency, result: fiIssue(run) ? null : runFiModel(run)};
  }), [scenarios, currency]);
  return <div className="fi-scenarios">
    <section aria-labelledby={`${id}-events`}>
      <h4 id={`${id}-events`}>Life events</h4>
      {events.length ? <ul className="money-list fi-events">{events.map(ev => <li key={ev.id}><span><strong>{ev.title}</strong> <span className="fine">· {ev.kind === 'in' ? '+' : '−'}{money(ev.amount.toFixed(0), currency)} in year {ev.year}{ev.every === 'yearly' ? ', and every year after' : ''}</span></span><button type="button" className="quiet" aria-label={`Remove ${ev.title}`} onClick={() => save(r => ({...r, events: (r.events ?? []).filter(x => x.id !== ev.id)}), `${ev.title} removed.`)}>Remove</button></li>)}</ul>
        : <p className="fine">A car in year 3, a sabbatical, a pension from year 25: an amount in or out that the paths above count.</p>}
      <form className="money-grid fi-event-form" onSubmit={addEvent} aria-label="Add a life event">
        <label className="field"><span>Event</span><input maxLength={60} value={title} placeholder="New car" onChange={e => setTitle(e.target.value)}/></label>
        <label className="field"><span>In year</span><input inputMode="numeric" value={year} onChange={e => setYear(e.target.value)}/></label>
        <label className="field"><span>Amount ({currency}, today’s money)</span><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}/></label>
        <label className="field"><span>Money</span><select value={kind} onChange={e => setKind(e.target.value as 'in' | 'out')}><option value="out">Out</option><option value="in">In</option></select></label>
        <label className="field"><span>How often</span><select value={every} onChange={e => setEvery(e.target.value as 'once' | 'yearly')}><option value="once">Once</option><option value="yearly">Every year from then</option></select></label>
        <button type="submit" className="secondary">Add event</button>
      </form>
    </section>
    <section aria-labelledby={`${id}-scenarios`}>
      <h4 id={`${id}-scenarios`}>Scenarios side by side</h4>
      {results.length ? <div className="money-table-wrap"><table className="money-table fi-scenario-table"><caption className="fine">Each scenario’s own figures and events, the same 1,000 paths</caption>
        <thead><tr><th scope="col">Scenario</th><th scope="col">Target</th><th scope="col">Middle path reaches it in</th><th scope="col">Paths that reach it</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
        <tbody>{results.map(({sc, currency: c, result}) => <tr key={sc.id}><th scope="row">{sc.name}</th><td>{result ? money(result.target.toFixed(0), c) : '—'}</td><td>{result ? yearsWord(result.yearsTo.p50) : 'figures out of range'}</td><td>{result ? `${Math.round(result.reached * 100)} %` : '—'}</td>
          <td><span className="fi-scenario-actions"><button type="button" className="quiet" aria-label={`Open ${sc.name} in the form`} onClick={() => { onOpen(sc.inputs); save(r => ({...r, events: (sc.events ?? []).map(x => ({...x}))}), `“${sc.name}” is in the form above, with its events.`); }}>Open</button><button type="button" className="quiet" aria-label={`Remove the scenario ${sc.name}`} onClick={() => save(r => ({...r, scenarios: (r.scenarios ?? []).filter(x => x.id !== sc.id)}), `Scenario “${sc.name}” removed.`)}>Remove</button></span></td></tr>)}</tbody>
      </table></div> : <p className="fine">Save the figures above as a scenario, change them, and save another: up to {MAX_SCENARIOS}, compared here.</p>}
      <form className="money-grid fi-event-form" onSubmit={saveScenario} aria-label="Save as a scenario">
        <label className="field"><span>Scenario name</span><input maxLength={40} value={name} placeholder="Part time from 50" onChange={e => setName(e.target.value)}/></label>
        <button type="submit" className="secondary">Save as a scenario</button>
      </form>
    </section>
    <p className="money-status" role="status">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </div>;
}
