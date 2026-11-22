'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {quoteOfTheDay, quoteSource} from '../../lib/journal/quotes';
import {localDate} from '../../lib/local-date';
import {useQuestionLang} from './question-lang';
import './today-affirmation.css';

/**
 * Session AV lane 2 (r3-notes; LEDGER #277, Stoic's daily quote): on Today's journal card, a quote of the day from Marcus
 * Aurelius, Seneca or Epictetus, the writer named, with "Another one" and "Write about this" (the Journal opens with an
 * entry that starts with the quote) — only when the person switched it on (Journal → Privacy); otherwise nothing at all
 * (no Tab stop is added to Today). In the language of the Journal's daily question (the Dutch words written for
 * ZIGoals). Lazy.
 */
export default function TodayQuote() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), [step, setStep] = useState(0);
  if (!journal.loaded || journal.data.quotes !== true) return null;
  const q = quoteOfTheDay(localDate(), step), nl = lang === 'nl';
  return <figure className="today-quote" role="group" aria-label={nl ? 'Citaat van vandaag' : 'Today’s quote'}>
    <span className="fine today-affirmation-label">{nl ? 'Citaat van vandaag' : 'Today’s quote'}</span>
    <blockquote lang={lang} className="today-quote-text" aria-live="polite"><p>{nl ? q.nl : q.en}</p></blockquote>
    <figcaption className="fine" lang={lang}>— {quoteSource(q, lang)}{nl ? ' (Nederlandse woorden geschreven voor ZIGoals)' : ''}</figcaption>
    <span className="today-quote-actions">
      <button type="button" className="text-link" onClick={() => setStep(n => n + 1)}>{nl ? 'Nog een' : 'Another one'}</button>
      <Link className="text-link" href={`/app/journal?quote=${q.id}`}>{nl ? 'Schrijf hierover' : 'Write about this'}</Link>
    </span>
  </figure>;
}
