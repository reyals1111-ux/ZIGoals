'use client';
import {useState} from 'react';
import {tipOf} from '../../../lib/workouts/run-tips';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #208, Nike Run Club's training tips): one short running tip a day on the Workouts page,
 * written in the repository in English and Dutch; "Another tip" shows the next, "In het Nederlands" the same tip in Dutch.
 * Plain runners' habits, not medical advice. Its own chunk.
 */
export default function RunTip({today}: {today: string}) {
  const [step, setStep] = useState(0), [lang, setLang] = useState<'en' | 'nl'>('en'), tip = tipOf(today, step);
  return <section className="av2-tip-card" aria-labelledby="av2-run-tip-title">
    <h3 id="av2-run-tip-title">{lang === 'en' ? 'A running tip' : 'Een looptip'}</h3>
    <p lang={lang} aria-live="polite">{tip[lang]}</p>
    <div className="av2-shoe-actions"><button type="button" className="quiet" lang={lang} onClick={() => setStep(n => n + 1)}>{lang === 'en' ? 'Another tip' : 'Nog een tip'}</button>
      {/* Session AV lane 2 (P-26): the other language is a quiet link beside the tip, not a second button */}<button type="button" className="text-link av2-run-tip-lang" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button></div>
  </section>;
}
