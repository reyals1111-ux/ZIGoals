'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {challengeDoneToday, challengeOfTheDay} from '../../lib/journal/challenges';
import {journalDay} from '../../lib/journal/journal-day';
import {useQuestionLang} from './question-lang';
import './today-affirmation.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #230, Reflectly's daily challenge): on Today's journal card, beside the
 * affirmation, one small challenge a day with "Done" and "Another one" — only when the person switched it on (Journal →
 * Privacy); otherwise nothing at all (no Tab stop is added to Today). Done is the person's own mark for today, kept as the
 * day only: never a count, a streak or a score. In the language of the Journal's daily question. Lazy.
 */
export default function TodayChallenge() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), [step, setStep] = useState(0), [said, setSaid] = useState('');
  if (!journal.loaded || journal.data.challenges !== true) return null;
  const today = journalDay(), done = challengeDoneToday(journal.data, today), nl = lang === 'nl';
  const mark = (on: boolean) => {
    try { journal.update(c => { const next = {...c}; if (on) next.challengeDone = today; else delete next.challengeDone; return next; }); setSaid(on ? (nl ? 'Gedaan. Mooi zo.' : 'Done. Nicely done.') : (nl ? 'Niet meer als gedaan gemarkeerd.' : 'No longer marked done.')); }
    catch { setSaid(nl ? 'Dit kon niet op dit apparaat worden bewaard.' : 'This could not be kept on this device.'); }
  };
  return <div className="today-challenge" role="group" aria-label={nl ? 'Kleine uitdaging van vandaag' : 'Today’s small challenge'}>
    <p className="today-affirmation"><span className="fine today-affirmation-label">{nl ? 'Kleine uitdaging' : 'A small challenge'}</span>{' '}
      <span lang={lang} className="today-affirmation-text" aria-live="polite">{challengeOfTheDay(today, step, lang)}</span></p>
    <p className="today-challenge-actions">
      <button type="button" className="text-link today-affirmation-next" aria-pressed={done} onClick={() => mark(!done)}>{done ? (nl ? 'Gedaan ✓' : 'Done ✓') : (nl ? 'Gedaan' : 'Done')}</button>
      <button type="button" className="text-link today-affirmation-next" onClick={() => { setStep(n => n + 1); setSaid(''); }}>{nl ? 'Een andere' : 'Another one'}</button>
      <span className="fine" role="status" aria-live="polite">{said}</span>
    </p>
  </div>;
}
