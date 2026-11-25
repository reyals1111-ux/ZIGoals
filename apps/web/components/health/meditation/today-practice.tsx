'use client';
import {useState} from 'react';
import {guideOfTheDay} from '../../../lib/meditation/guides';
import {DEFAULT_BELLS} from '../../../lib/meditation/engine';
import {ring} from '../../../lib/meditation/bells';
import {startRun} from '../../../lib/meditation/timer';
import type {MeditationStore} from './use-meditation';
import {ReadAloud} from '../../read-aloud/read-aloud';

/**
 * Session AV lane 2 (habits pillar; LEDGER #71, #77 — Headspace's Today's Meditation, Calm's daily): today's written
 * practice (lib/meditation/guides.ts), in English or Dutch, with "Another one", and "Begin" that starts the existing
 * timer with its bells for the practice's minutes (the same as Begin → Sit with a timer). Text only; no audio.
 */
export default function TodayPractice({store, today, onStarted}: {store: MeditationStore; today: string; onStarted: () => void}) {
  const [step, setStep] = useState(0), [lang, setLang] = useState<'en' | 'nl'>('en'), [error, setError] = useState('');
  const g = guideOfTheDay(today, step), t = g[lang];
  const begin = () => {
    try { store.run.update(() => startRun({now: new Date(), minutes: g.minutes, kind: 'timer'})); }
    catch { setError('This device could not start the session.'); return; }
    const bells = store.meditation.bells ?? {...DEFAULT_BELLS, updatedAt: ''};
    void ring(bells.sound, bells.volume);
    onStarted();
  };
  return <div className="meditation-today" lang={lang}>
    <p className="eyebrow">{g.minutes} min · {step === 0 ? (lang === 'nl' ? 'vandaag' : 'today') : (lang === 'nl' ? 'een andere' : 'another one')}</p>
    <h3 className="meditation-today-title">{t.title}</h3>
    <ol className="meditation-today-steps">{t.steps.map(s => <li key={s}>{s}</li>)}</ol>
    {/* Session AW (programmes; amendment 3): the guide read in this device's own voice, shown only when it has one. */}
    <ReadAloud key={`${g.id}-${lang}`} lang={lang} what={t.title} text={`${t.title}. ${t.steps.join(' ')}`}/>
    {/* Session AV lane 2 (polish4): in Dutch the buttons and the note under them are Dutch too, as the routine library's are. */}
    <p className="meditation-today-actions">
      <button type="button" className="primary" onClick={begin}>{lang === 'nl' ? `Begin · ${g.minutes} min met de bel` : `Begin · ${g.minutes} min with the bell`}</button>
      <button type="button" className="quiet" onClick={() => setStep(n => n + 1)}>{lang === 'nl' ? 'Nog een' : 'Another one'}</button>
      <button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(l => l === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button>
    </p>
    {error && <p role="alert" className="fine" lang="en">{error}</p>}
    <p className="fine">{lang === 'nl' ? 'Een geschreven oefening om te lezen voor je begint, of om naar te kijken terwijl je zit. Ontspanning, geen behandeling.' : 'A written practice to read before you begin, or to glance at while you sit. Relaxation, not treatment.'}</p>
  </div>;
}
