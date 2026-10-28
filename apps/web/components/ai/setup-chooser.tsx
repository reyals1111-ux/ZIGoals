'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
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
  // Session AI (ZI8; Grok's D-242): the result is brought into view when it appears (it was below the fold).
  const resultRef = useRef<HTMLElement>(null), route = result?.route ?? null;
  useEffect(() => { if (!route) return; const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; resultRef.current?.scrollIntoView({block: 'nearest', behavior: reduce || document.documentElement.dataset.appMotion === 'off' ? 'auto' : 'smooth'}); }, [route]);
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
    {result && <article ref={resultRef} className="ai-chooser-result" aria-live="polite" aria-label="Recommendation">
      {/* Session AI (ZI8, ST5; Grok's D-092): informational wording, never "our suggestion" for a paid product. */}
      <p className="eyebrow">Fits your answers</p>
      <h4>{result.title}</h4>
      <p>{result.why}</p>
      <div className="ai-chooser-columns">
        <div><p className="ai-chooser-head">Good</p><ul>{result.pros.map(p => <li key={p}>{p}</li>)}</ul></div>
        <div><p className="ai-chooser-head">Keep in mind</p><ul>{result.cons.map(c => <li key={c}>{c}</li>)}</ul></div>
      </div>
      <p className="ai-chooser-head">Next steps</p>
      <ol>{result.steps.map(s => <li key={s}>{s}</li>)}</ol>
      {result.also && <p className="ai-note">Also a good fit: {ROUTE_TITLES[result.also]}.</p>}
      {/* Session AI (ZI8; Grok's M-019, M-020): an action, and the way to "Set up" from inside the quiz. */}
      <div className="ai-card-actions"><Link className="primary" href="/app/settings#your-ai">Set this up</Link><button type="button" className="text-link" onClick={() => setAnswers({})}>Start over</button></div>
    </article>}
  </div>;
}
