'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {QUADRANTS, clearFeeling, nextStepFor, nextStepLink, quadrantOfWord, setFeeling, walkHabit, type NextStep, type QuadrantId} from '../../lib/mood-words/words';
import {habitRuleOn} from '../../lib/habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import './mood-words.css';
import {wordsOf} from '../../lib/mood-words/schema';

/**
 * Session AK (lane S, item 6): the grid itself. Two axes (energy up, pleasantness right) make four labelled quadrants; a
 * quadrant opens its twelve words; one tap on a word saves {energy, pleasantness, word} for the day in the energy record
 * (zigoals:energy:v1 `words`). An unpleasant word offers at most one small next step into an existing feature.
 */
export default function MoodWordsGrid({day, onClose}: {day: string; onClose: () => void}) {
  const energy = useDeviceRecord(ENERGY), id = useId();
  const current = wordsOf(energy.data)[day]?.word ?? null;
  const [quadrant, setQuadrant] = useState<QuadrantId | null>(() => (current ? quadrantOfWord(current)?.id : null) ?? null), [status, setStatus] = useState('');
  const words = useRef<HTMLDivElement>(null);
  useEffect(() => { if (quadrant) words.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [quadrant]);
  const pick = (word: string) => {
    try { energy.update(r => setFeeling(r, day, word, new Date().toISOString())); setStatus(`Feeling today: ${word}. Kept on this device.`); }
    catch { setStatus('This could not be saved on this device.'); }
  };
  const remove = () => { try { energy.update(r => clearFeeling(r, day)); setStatus('The feeling word is removed.'); setQuadrant(null); } catch { setStatus('This could not be changed on this device.'); } };
  const q = QUADRANTS.find(x => x.id === quadrant), step = current ? nextStepFor(current) : null;
  // The grid reads top row high energy, bottom row low; left unpleasant, right pleasant.
  const order: QuadrantId[] = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'];
  return <section className="mood-words" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="mood-words-title">A word for how it feels</h3>
    <div className="mood-words-axes">
      <span className="mood-words-axis is-y" aria-hidden="true">Energy ↑</span>
      <div className="mood-words-quadrants" role="group" aria-label="Choose a corner: energy and how pleasant it feels">
        {order.map(qid => { const x = QUADRANTS.find(y => y.id === qid)!; return <button key={qid} type="button" className="mood-words-quadrant" data-quadrant={qid} aria-pressed={quadrant === qid} onClick={() => setQuadrant(qid)}>{x.title}</button>; })}
      </div>
      <span className="mood-words-axis is-x" aria-hidden="true">Pleasant →</span>
    </div>
    {q && <div className="mood-words-list" ref={words} role="group" aria-label={`Words: ${q.title}`} data-quadrant={q.id}>
      {q.words.map(w => <button key={w} type="button" className="mood-words-word" aria-pressed={current === w} onClick={() => pick(w)}>{w}</button>)}
    </div>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
    {step && <NextStepLink step={step}/>}
    <p className="mood-words-actions">{current && <button type="button" className="text-link" onClick={remove}>Remove the word</button>}<button type="button" className="text-link" onClick={onClose}>Done</button></p>
  </section>;
}

function NextStepLink({step}: {step: NextStep}) {
  return step === 'walk' ? <WalkStep/> : <StepLink step={step} walkId={null}/>;
}
function WalkStep() {
  const habits = useHabits();
  const walk = habits.loaded && !habits.error ? walkHabit(habits.data.habits.filter(h => habitRuleOn(h, habits.today)?.state !== 'archived')) : undefined;
  return <StepLink step="walk" walkId={walk?.id ?? null}/>;
}
function StepLink({step, walkId}: {step: NextStep; walkId: string | null}) {
  const link = nextStepLink(step, walkId);
  return <p className="mood-words-step"><span className="fine">One small step, if you like:</span>{' '}
    {link.fullLoad ? <a className="secondary" href={link.href}>{link.label}</a> /* a full load on purpose: Health's camera and Bluetooth policy applies to its own document */
      : <Link className="secondary" href={link.href}>{link.label}</Link>}
  </p>;
}
