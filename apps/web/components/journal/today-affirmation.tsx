'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {affirmationOfTheDay} from '../../lib/journal/affirmations';
import {localDate} from '../../lib/local-date';
import {useQuestionLang} from './question-lang';
import './today-affirmation.css';

/**
 * Session AV lane 2 (journal; LEDGER #176, Fabulous's daily affirmations): on Today's journal card, one affirmation a
 * day with "Another one" — only when the person switched it on (Journal → Privacy); otherwise nothing at all (no Tab
 * stop is added to Today). In the language of the Journal's daily question. Lazy.
 */
export default function TodayAffirmation() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), [step, setStep] = useState(0);
  if (!journal.loaded || journal.data.affirmations !== true) return null;
  return <p className="today-affirmation" role="group" aria-label={lang === 'nl' ? 'Affirmatie van vandaag' : 'Today’s affirmation'}>
    <span className="fine today-affirmation-label">{lang === 'nl' ? 'Affirmatie van vandaag' : 'Today’s affirmation'}</span>{' '}
    <span lang={lang} className="today-affirmation-text" aria-live="polite">{affirmationOfTheDay(localDate(), step, lang)}</span>{' '}
    <button type="button" className="text-link today-affirmation-next" onClick={() => setStep(n => n + 1)}>{lang === 'nl' ? 'Nog een' : 'Another one'}</button>
  </p>;
}
