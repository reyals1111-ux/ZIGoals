'use client';
import {useMoodLook} from '../../mood-look/use-mood-look';
import {stripLabel} from '../../../lib/checkin-extras/strip-label';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useRef, useState, type ReactNode} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {useHealth} from '../use-health';
import {ENERGY, ENERGY_WORDS, rateEnergy, type Energy} from '../../../lib/energy/schema';
import {SEVERITY_WORDS, SYMPTOMS, type Symptoms} from '../../../lib/symptoms/schema';
import {addItem, levelOn, setLevel} from '../../../lib/symptoms/symptoms';
import {SUPPLEMENTS} from '../../../lib/supplements/schema';
import {dayDoses, markSupplement} from '../../../lib/supplements/log';
import {moodOn, setMood, setMoodNote} from '../../../lib/wrap-up/engine';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {dailySeries} from '../../../lib/sleep/engine';
import {wordsOf} from '../../../lib/mood-words/schema';
import {addLocalDays} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {PARTS, PART_WORDS, dayTotal, loggedStrip, readCheckin, readyMatches, setItemText, setLogged, setMoment, setTimes, type Part} from '../../../lib/checkin-extras/rule';
import './evening-checkin.css';
const MoodWordsGrid = lazy(() => import('../../mood-words/mood-words-grid'));

/**
 * Session AV lane 2 (habits pillar; LEDGER #60, #62, #63, #68 — Bearable's daily check-in): one optional evening flow,
 * step by step, each step skippable: how the day was (mood, energy, and a mood per part of the day), a feeling word
 * (with your own words), symptoms and factors (a level, the parts of the day, a group and a "why I track this" note, a
 * ready list to pick from, the day's total), last night, supplements and medication, and a note. Every answer saves the
 * moment it is given into the record it belongs to; the end marks the day "Day logged". The last 14 days show which
 * were logged, each gap a link to fill it in. All on this device; nothing is sent anywhere.
 */
const STEPS = [['mood', 'How was the day?'], ['feeling', 'A word for it'], ['symptoms', 'Symptoms and factors'], ['night', 'Last night'], ['supplements', 'Supplements and medication'], ['note', 'A note']] as const;
export default function EveningCheckin({date, today}: {date: string; today: string}) {
  const moodLook = useMoodLook(); // Session AV lane 2 (LEDGER #178): your own mood words, else ZIGoals'
  const day = date > today ? today : date, when = day === today ? 'today' : formatDate(day);
  const health = useHealth(), energy = useDeviceRecord(ENERGY), symptoms = useDeviceRecord(SYMPTOMS), supplements = useDeviceRecord(SUPPLEMENTS);
  const [step, setStep] = useState<number | null>(null), [said, setSaid] = useState(''), heading = useRef<HTMLHeadingElement>(null), start = useRef<HTMLButtonElement>(null), moved = useRef(false);
  useEffect(() => { if (!moved.current) return; (step === null ? start.current : heading.current)?.focus(); }, [step]);
  const go = (n: number | null) => { moved.current = true; setSaid(''); setStep(n); };
  if (!health.loaded || !energy.loaded || !symptoms.loaded || !supplements.loaded) return <p className="fine" role="status">Opening your check-in…</p>;
  const c = readCheckin(energy.data), logged = !!c.logged[day];
  const save = (fn: () => void, words: string) => { try { fn(); setSaid(words); } catch (cause) { setSaid(plainErrorMessage(cause, 'This was not saved on this device. Nothing was changed.')); } };
  const strip = loggedStrip(c, today, 14, addLocalDays);
  const gaps = strip.filter(s => !s.logged).length;
  const header = <div className="checkin-head">
    <p className="checkin-logged" data-testid="checkin-logged">{logged ? <><span aria-hidden="true">✓ </span>Day logged · {when}</> : `Not logged yet · ${when}`}</p>
    {/* Review b1 #15: each box shows its day ("M 16", "Today"); the full date stays in its name. */}
    <ol className="checkin-strip" aria-label={`The last 14 days: ${14 - gaps} logged, ${gaps} not yet`}>{strip.map(s => <li key={s.day} className={s.logged ? 'is-logged' : 'is-gap'} data-today={s.day === today || undefined}>{s.logged
      ? <span title={formatDate(s.day)}><span className="sr-only">{formatDate(s.day)}: logged</span><span className="checkin-strip-day" aria-hidden="true">{stripLabel(s.day, today)}</span><span aria-hidden="true">✓</span></span>
      : <Link href={`/app/health?date=${s.day}`} aria-label={`${formatDate(s.day)}: not logged; open it`} title={formatDate(s.day)}><span className="checkin-strip-day" aria-hidden="true">{stripLabel(s.day, today)}</span><span aria-hidden="true">·</span></Link>}</li>)}</ol>
  </div>;
  if (step === null) return <section className="checkin" aria-labelledby="checkin-title"><h3 id="checkin-title" className="sr-only">Evening check-in</h3>{header}
    <p className="fine">Six short steps for {when}, each one skippable. Every answer is saved the moment you give it.</p>
    <p className="checkin-actions"><button ref={start} type="button" className="primary" onClick={() => go(0)}>{logged ? 'Go through it again' : 'Start the check-in'}</button>
      {logged && <button type="button" className="quiet" onClick={() => save(() => energy.update(r => setLogged(r, day, false, new Date().toISOString())), `${when === 'today' ? 'Today' : when} is no longer marked logged.`)}>Not logged after all</button>}</p>
    {said && <p className="fine" role="status">{said}</p>}
  </section>;
  const [id, title] = STEPS[step]!, last = step === STEPS.length - 1, at = () => new Date().toISOString();
  const mood = moodOn(health.data, day), energyToday = energy.data.days[day]?.energy;
  const finish = () => { save(() => energy.update(r => setLogged(r, day, true, at())), `Day logged: ${when}.`); moved.current = true; setStep(null); };
  let body: ReactNode = null;
  if (id === 'mood') body = <>
    <div className="checkin-row" role="group" aria-label={`Mood ${when}`}>{moodLook.words.map((w, i) => <button key={i} type="button" className="secondary" aria-pressed={mood?.mood === i + 1} onClick={() => void health.update(h => setMood(h, day, i + 1, at())).then(() => setSaid(`Mood ${when}: ${w.toLowerCase()}.`), () => setSaid('Your mood was not saved. Nothing was changed.'))}>{w}</button>)}</div>
    <div className="checkin-row" role="group" aria-label={`Energy ${when}`}>{ENERGY_WORDS.en.map((w, i) => <button key={w} type="button" className="secondary" aria-pressed={energyToday === i + 1} onClick={() => save(() => energy.update(r => rateEnergy(r, day, i + 1, at())), `Energy ${when}: ${w}.`)}>{w}</button>)}</div>
    <details className="checkin-more"><summary>By part of the day (optional)</summary><div className="checkin-parts">{PARTS.map(p => <label key={p} className="field"><span>{PART_WORDS[p].en}</span><select value={c.moments[day]?.[p] ?? ''} onChange={e => save(() => energy.update(r => setMoment(r, day, p, e.target.value ? Number(e.target.value) : null)), `${PART_WORDS[p].en}: ${e.target.value ? moodLook.words[Number(e.target.value) - 1]!.toLowerCase() : 'no answer'}.`)}><option value="">No answer</option>{moodLook.words.map((w, i) => <option key={i} value={i + 1}>{w}</option>)}</select></label>)}</div></details>
  </>;
  if (id === 'feeling') body = <>{wordsOf(energy.data)[day] && <p className="fine">Chosen: {wordsOf(energy.data)[day]!.word}.</p>}<Suspense fallback={<p className="fine">Opening the words…</p>}><MoodWordsGrid day={day} onClose={() => go(step + 1)}/></Suspense></>;
  if (id === 'symptoms') body = <SymptomStep day={day} when={when} symptoms={symptoms} energy={energy} save={save}/>;
  if (id === 'night') {
    const sleep = healthGroupIn(health.data, 'sleep'), point = sleep ? dailySeries(sleep, day, 1)[0] : undefined;
    body = point && point.asleep !== null ? <p>The night that ended {when}: <strong>{Math.floor(point.asleep / 60)} h {String(Math.round(point.asleep % 60)).padStart(2, '0')} min asleep</strong>{point.quality ? `, quality ${point.quality} of 5` : ''}. <Link href={`/app/health?view=sleep&date=${day}`}>Change it in Sleep</Link>.</p>
      : <p>No night is logged for {when} yet. <Link href={`/app/health?view=sleep&date=${day}`}>Log last night in Sleep</Link>, or skip this step.</p>;
  }
  if (id === 'supplements') {
    const doses = supplements.unreadable ? [] : dayDoses(supplements.data, day);
    body = doses.length ? <ul className="checkin-doses">{doses.map(d => <li key={`${d.itemId}|${d.slot}`}><span>{d.name}{d.dose ? ` · ${d.dose}` : ''}{d.slot !== 'any' ? ` · ${d.slot}` : ''}</span><span className="checkin-row" role="group" aria-label={`${d.name}${d.slot !== 'any' ? ` at ${d.slot}` : ''}`}>{(['taken', 'skipped'] as const).map(s => <button key={s} type="button" className="secondary" aria-pressed={d.status === s} onClick={() => save(() => supplements.update(r => markSupplement(r, d.itemId, day, d.slot, d.status === s ? null : s, at())), `${d.name}: ${d.status === s ? 'not logged' : s}.`)}>{s === 'taken' ? 'Taken' : 'Skipped'}</button>)}</span></li>)}</ul>
      : <p>No supplement or medication is kept yet. <Link href="/app/health">Add one in Health → Supplements</Link>, or skip this step.</p>;
  }
  if (id === 'note') body = mood ? <NoteStep key={day} initial={mood.note ?? ''} onSave={text => void health.update(h => setMoodNote(h, day, text, at())).then(() => setSaid(text.trim() ? 'Your note is saved on this device.' : 'The note is removed.'), () => setSaid('Your note was not saved.'))}/>
    : <p>A note goes with the day’s mood. <button type="button" className="text-link" onClick={() => go(0)}>Choose the mood first</button>, or skip.</p>;
  return <section className="checkin" aria-labelledby="checkin-step-title">{header}
    <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
    <h3 id="checkin-step-title" ref={heading} tabIndex={-1}>{title}</h3>
    {body}
    {said && <p className="fine" role="status">{said}</p>}
    <p className="checkin-actions">
      {step > 0 && <button type="button" className="quiet" onClick={() => go(step - 1)}>Back</button>}
      {!last && <button type="button" className="quiet" onClick={() => go(step + 1)}>Skip</button>}
      {last ? <button type="button" className="primary" onClick={finish}>Finish: day logged</button> : <button type="button" className="primary" onClick={() => go(step + 1)}>Next</button>}
      <button type="button" className="text-link" onClick={() => go(null)}>Stop here</button>
    </p>
  </section>;
}

function SymptomStep({day, when, symptoms, energy, save}: {day: string; when: string; symptoms: DeviceRecordState<Symptoms>; energy: DeviceRecordState<Energy>; save: (fn: () => void, words: string) => void}) {
  const [query, setQuery] = useState('');
  if (symptoms.unreadable) return <p role="alert">Your symptom list on this device could not be read. It was not changed.</p>;
  const c = readCheckin(energy.data), items = symptoms.data.items, levels = symptoms.data.days[day], total = dayTotal(levels), at = () => new Date().toISOString();
  const groups = [...new Set(items.map(i => c.groups[i.id] ?? ''))].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b));
  const ready = readyMatches(query, items.map(i => i.name)).slice(0, 8);
  return <>
    {items.length > 0 && <p className="checkin-total">{when === 'today' ? 'Today' : when}: {total.noted} noted{total.strong ? `, ${total.strong} strong` : ''} · day total {total.total} of {items.length * 3}</p>}
    {groups.map(g => <div key={g || 'none'} className="checkin-group">{groups.length > 1 && <h4>{g || 'Not in a group'}</h4>}
      <ul className="checkin-items">{items.filter(i => (c.groups[i.id] ?? '') === g).map(item => {
        const level = levelOn(symptoms.data, day, item.id), parts = c.times[day]?.[item.id] ?? [];
        const flip = (p: Part) => { const next = parts.includes(p) ? parts.filter(x => x !== p) : [...parts, p]; save(() => energy.update(r => setTimes(r, day, item.id, next)), `${item.name}: ${next.length ? next.map(x => PART_WORDS[x].en.toLowerCase()).join(', ') : 'no part of the day'}.`); };
        return <li key={item.id}>
          <p className="checkin-item-name"><strong>{item.name}</strong> <small className="fine">· {item.kind}{c.notes[item.id] ? ` · ${c.notes[item.id]}` : ''}</small></p>
          <div className="checkin-row" role="group" aria-label={`${item.name} ${when}`}>{SEVERITY_WORDS.map((w, i) => <button key={w} type="button" className="secondary" aria-pressed={level === i} onClick={() => save(() => symptoms.update(r => setLevel(r, day, item.id, i)), `${item.name} ${when}: ${w.toLowerCase()}.`)}>{w}</button>)}</div>
          {level !== undefined && level > 0 && <div className="checkin-row" role="group" aria-label={`When ${item.name} was there`}>{PARTS.map(p => <button key={p} type="button" className="quiet" aria-pressed={parts.includes(p)} onClick={() => flip(p)}>{PART_WORDS[p].en}</button>)}</div>}
          <details className="checkin-more"><summary aria-label={`Why and group for ${item.name}`}>Why I track this, and a group</summary>
            <ItemText label="Why I track this" max={140} initial={c.notes[item.id] ?? ''} onSave={v => save(() => energy.update(r => setItemText(r, 'notes', item.id, v)), v.trim() ? `${item.name}: why saved.` : `${item.name}: why removed.`)}/>
            <ItemText label="Group (such as Digestion)" max={30} initial={c.groups[item.id] ?? ''} onSave={v => save(() => energy.update(r => setItemText(r, 'groups', item.id, v)), v.trim() ? `${item.name} is in ${v.trim()}.` : `${item.name} is in no group.`)}/>
          </details>
        </li>;
      })}</ul></div>)}
    <details className="checkin-more" open={items.length === 0}><summary>Add from a ready list</summary>
      <label className="field"><span>Search the list</span><input type="search" value={query} autoComplete="off" onChange={e => setQuery(e.target.value)}/></label>
      {ready.length ? <ul className="checkin-ready">{ready.map(f => <li key={f.name}><button type="button" className="secondary" onClick={() => save(() => symptoms.update(r => addItem(r, f.name, f.kind, at())), `${f.name} is added to your list.`)}>+ {f.name} <small>· {f.kind}</small></button></li>)}</ul> : <p className="fine">Nothing in the ready list matches. Health → Symptoms and factors adds a name of your own.</p>}
    </details>
  </>;
}
function ItemText({label, max, initial, onSave}: {label: string; max: number; initial: string; onSave: (v: string) => void}) {
  const [v, setV] = useState(initial);
  return <label className="field"><span>{label}</span><input type="text" value={v} maxLength={max} autoComplete="off" onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() !== initial.trim()) onSave(v); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (v.trim() !== initial.trim()) onSave(v); } }}/></label>;
}
function NoteStep({initial, onSave}: {initial: string; onSave: (text: string) => void}) {
  const [v, setV] = useState(initial);
  return <div className="checkin-note"><label className="field"><span>A few words about the day (up to 280)</span><textarea rows={3} maxLength={280} value={v} onChange={e => setV(e.target.value)}/></label><button type="button" className="secondary" onClick={() => onSave(v)}>Save the note</button></div>;
}
