'use client';
import {useEffect, useId, useState} from 'react';
import {onDeviceAvailability, type OnDeviceAvailability} from '../../lib/ai/on-device';
import {asksMemory, QUESTIONS, recommend, ROUTE_TITLES, type Answers} from '../../lib/ai/setup-chooser';
import './setup-chooser.css';

/**
 * "Which setup fits me?" (Session V Part 15), in Settings and in the panel before setup: three or four questions, one
 * at a time, then one recommendation with its honest pros and cons and the exact next steps. Worked out on this device
 * from the answers and from what this browser says it can do; nothing is stored or sent.
 */
type Key = keyof typeof QUESTIONS;
export default function SetupChooser({hosted = false}: {hosted?: boolean}) {
  const [answers, setAnswers] = useState<Partial<Answers>>({}), [onDevice, setOnDevice] = useState<OnDeviceAvailability>('unavailable'), id = useId();
  // What Chrome says about its own model here: a read, never a download.
  useEffect(() => { let live = true; void onDeviceAvailability().then(state => { if (live) setOnDevice(state); }); return () => { live = false; }; }, []);
  const keys: Key[] = ['have', 'where', 'matters', ...(asksMemory(answers) ? ['memory' as const] : [])];
  const shown = keys.slice(0, keys.findIndex(k => answers[k] === undefined) + 1 || keys.length);
  const complete = keys.every(k => answers[k] !== undefined);
  const result = complete ? recommend(answers as Answers, {onDevice, hosted}) : null;
  const choose = (key: Key, value: string) => setAnswers(current => {
    const next = {...current, [key]: value} as Partial<Answers>;
    // A changed answer can make the memory question moot: it is dropped, not kept hidden.
    if (!asksMemory(next)) delete next.memory;
    return next;
  });
  // The place that shows it names it (the panel's view, the Settings card), so this has no heading of its own.
  return <div className="ai-chooser">
    <p className="ai-note">A few questions, answered here on this device; nothing is stored or sent.</p>
    {shown.map(key => <fieldset key={key} className="ai-chooser-question"><legend>{QUESTIONS[key].label}</legend>
      <div className="ai-chooser-options">{Object.entries(QUESTIONS[key].options).map(([value, label]) => <label key={value} className="ai-chooser-option">
        <input type="radio" name={`${id}-${key}`} value={value} checked={answers[key] === value} onChange={() => choose(key, value)}/>
        <span>{label}</span>
      </label>)}</div>
    </fieldset>)}
    {result && <article className="ai-chooser-result" aria-live="polite" aria-label="Recommendation">
      <p className="eyebrow">Our suggestion</p>
      <h4>{result.title}</h4>
      <p>{result.why}</p>
      <div className="ai-chooser-columns">
        <div><p className="ai-chooser-head">Good</p><ul>{result.pros.map(p => <li key={p}>{p}</li>)}</ul></div>
        <div><p className="ai-chooser-head">Keep in mind</p><ul>{result.cons.map(c => <li key={c}>{c}</li>)}</ul></div>
      </div>
      <p className="ai-chooser-head">Next steps</p>
      <ol>{result.steps.map(s => <li key={s}>{s}</li>)}</ol>
      {result.also && <p className="ai-note">Also a good fit: {ROUTE_TITLES[result.also]}.</p>}
      <button type="button" className="text-link" onClick={() => setAnswers({})}>Start over</button>
    </article>}
  </div>;
}
