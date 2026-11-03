'use client';
import {lazy, Suspense, useState} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {LoadBoundary} from '../load-boundary';
import './mood-words.css';
import {wordsOf} from '../../lib/mood-words/schema';

const MoodWordsGrid = lazy(() => import('./mood-words-grid'));
/**
 * Session AK (lane S, item 6): the optional feeling word after the 1–5 energy or mood, in the daily check-in and the
 * journal. Closed it is one button (or the day's word with "Change"); the grid's code loads when it is opened.
 */
export function MoodWordsFold({day}: {day: string}) {
  const energy = useDeviceRecord(ENERGY), [open, setOpen] = useState(false);
  if (!energy.loaded || energy.unreadable) return null;
  const word = wordsOf(energy.data)[day]?.word;
  return <div className="mood-words-fold">
    {!open && <p className="mood-words-trigger">{word ? <>Feeling: <strong>{word}</strong> <button type="button" className="text-link" onClick={() => setOpen(true)}>Change</button></> : <button type="button" className="secondary" onClick={() => setOpen(true)}>Add a feeling word (optional)</button>}</p>}
    {open && <LoadBoundary label="Feeling words"><Suspense fallback={<p className="fine">Opening feeling words…</p>}><MoodWordsGrid day={day} onClose={() => setOpen(false)}/></Suspense></LoadBoundary>}
  </div>;
}
