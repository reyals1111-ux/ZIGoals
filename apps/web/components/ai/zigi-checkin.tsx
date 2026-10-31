'use client';
import {useId, useState} from 'react';
import {ENERGY, ENERGY_WORDS, rateEnergy} from '../../lib/energy/schema';
import {CELEBRATIONS} from '../../lib/celebrations';
import {checkinMoment, followUpLine, NOTE_MAX, NOTE_SAVED} from '../../lib/checkin/checkin';
import {dismissedOn, dismissFor} from '../../lib/ai/proactive/dismiss';
import {ZIGI, zigiPersonality} from '../../lib/ai/store/records';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {dailyData, healthDay} from '../../lib/health-daily';
import {MOOD_WORDS, moodOn, setMood, setMoodNote} from '../../lib/wrap-up/engine';
import {isShown} from '../../lib/pages/visibility';
import {getAppStorage} from '../../lib/showcase-storage';
import {useHealth} from '../health/use-health';
import {usePagesView} from '../pages/use-pages-view';
import {zigiSignals} from '../zigi/bus';
import {useDeviceRecord} from './use-device-record';
import '../for-you/for-you.css';
// Session AK (lane S, item 6): the optional feeling word after the 1–5 (its grid loads when opened).
import {MoodWordsFold} from '../mood-words/mood-words-fold';

/**
 * Session AJ (item 10, D14; docs/research/session-aj/COMPANIONS.md P1, P4): "ZIGi · Your day" check-in v2, on the morning
 * brief. Energy (zigoals:energy:v1, as before), the day's mood (Health's moods; shown only while the Health page shows)
 * and one short note with that mood. Each saves on its own tap; there is no submit. Then one kind line, made here by
 * rules in the person's chosen personality (lib/checkin/checkin.ts), and one mascot moment: empathetic on a low day,
 * celebrate-once for the first check-in and the 7th, 30th, 100th and 365th check-in day, a small "noted" otherwise.
 * "Skip today" hides it for the day. Nothing leaves the device.
 */
export const CHECKIN_ID = 'checkin';
export function ZigiCheckIn({day}: {day: string}) {
  const energy = useDeviceRecord(ENERGY), zigi = useDeviceRecord(ZIGI), celebrations = useDeviceRecord(CELEBRATIONS), health = useHealth(), id = useId();
  const showMood = isShown(usePagesView(), 'health');
  const [status, setStatus] = useState(''), [draft, setDraft] = useState<string | null>(null);
  if (!energy.loaded || !zigi.loaded) return null;
  if (dismissedOn(zigi.data, day).has(CHECKIN_ID)) return null;
  const personality = zigiPersonality(zigi.data);
  const moodDay = showMood && health.loaded && !health.error ? healthDay(dailyData(health.data).preferences.timezone, new Date()) : null;
  const mood = moodDay ? moodOn(health.data, moodDay) : undefined;
  const todayEnergy = energy.data.days[day]?.energy ?? null, todayMood = mood?.mood ?? null;
  const follow = followUpLine({energy: todayEnergy, mood: todayMood, personality});
  /** The days with a check-in after this save (energy or mood), for the totals ZIGi marks once each. */
  const daysAfter = (energyDays: readonly string[], moodDays: readonly string[]) => new Set([...energyDays, ...moodDays]).size;
  const react = (low: boolean, firstSaveToday: boolean, energyDays: readonly string[]) => {
    const moodDays = health.loaded && !health.error ? Object.keys((health.data as {moods?: {days: Record<string, unknown>}}).moods?.days ?? {}) : [];
    const seen = celebrations.loaded && !celebrations.unreadable ? celebrations.data.seen : {};
    const moment = checkinMoment({days: daysAfter(energyDays, moodDays), seen, firstSaveToday, low});
    if (!moment) return;
    if (moment.ledgerId && celebrations.loaded && !celebrations.unreadable) { const ledgerId = moment.ledgerId; try { celebrations.update(n => ({...n, seen: {...n.seen, [ledgerId]: day}})); } catch { /* the moment still plays once in this view */ } }
    if (moment.validated) zigiSignals.emitValidated(moment.signal); else zigiSignals.emit(moment.signal);
  };
  const rate = (n: number) => {
    const first = todayEnergy === null && todayMood === null;
    try {
      let days: string[] = [];
      energy.update(current => { const next = rateEnergy(current, day, n, new Date().toISOString()); days = Object.keys(next.days); return next; });
      setStatus(`Energy today: ${ENERGY_WORDS.en[n - 1]}. Noted on this device; the Journal shows your last 14 days.`);
      react(followUpLine({energy: n, mood: todayMood})?.low ?? false, first, days);
    } catch { setStatus('This could not be saved on this device.'); }
  };
  const feel = async (n: number) => {
    if (!moodDay) return;
    const first = todayEnergy === null && todayMood === null;
    try {
      await health.update(h => setMood(h, moodDay, n, new Date().toISOString()));
      setStatus(`Mood today: ${MOOD_WORDS[n - 1]}. Saved in your Health journal on this device.`);
      react(followUpLine({energy: todayEnergy, mood: n})?.low ?? false, first, Object.keys(energy.data.days));
    } catch (cause) { setStatus(cause instanceof Error && cause.message ? cause.message : 'Not saved. Your Health journal is unchanged.'); }
  };
  const saveNote = async () => {
    if (!moodDay || draft === null) return;
    try { await health.update(h => setMoodNote(h, moodDay, draft.slice(0, NOTE_MAX), new Date().toISOString())); setDraft(null); setStatus(NOTE_SAVED.en); }
    catch (cause) { setStatus(cause instanceof Error && cause.message ? cause.message : 'Not saved. Your Health journal is unchanged.'); }
  };
  const skip = () => { try { dismissFor(getAppStorage(), day, CHECKIN_ID); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_KEY})); } catch { /* it stays; nothing else changes */ } };
  const note = draft ?? mood?.note ?? '';
  return <div className="zigi-checkin-v2">
    <fieldset className="journal-energy zigi-checkin"><legend>{todayEnergy ? 'Your energy today' : 'Check in: how is your energy this morning?'}</legend>
      {[1, 2, 3, 4, 5].map(n => <label key={n} className="journal-energy-dot" title={ENERGY_WORDS.en[n - 1]}><input type="radio" name={`${id}-energy`} checked={todayEnergy === n} onChange={() => rate(n)}/><span aria-hidden="true">{n}</span><span className="sr-only">{n} of 5, {ENERGY_WORDS.en[n - 1]}</span></label>)}
      <span className="fine journal-energy-word">{todayEnergy ? ENERGY_WORDS.en[todayEnergy - 1] : '1 drained · 5 full of energy'}</span>
    </fieldset>
    {moodDay && <fieldset className="zigi-checkin-mood"><legend>{todayMood ? 'How the day feels' : 'And how does the day feel?'}</legend>
      <div className="wrap-up-mood-choices">{MOOD_WORDS.map((word, i) => <button key={word} type="button" className="secondary" aria-pressed={todayMood === i + 1} onClick={() => void feel(i + 1)}>{word}</button>)}</div>
    </fieldset>}
    {(todayEnergy !== null || todayMood !== null) && <MoodWordsFold day={day}/>}
    {moodDay && todayMood !== null && <div className="zigi-checkin-note">
      <label className="field">One line about today (optional)<input value={note} maxLength={NOTE_MAX} onChange={event => setDraft(event.target.value)} onBlur={() => void saveNote()} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveNote(); } }} placeholder="Only you see this"/></label>
      <span className="fine">{note.length} of {NOTE_MAX} characters · kept with the day&rsquo;s mood, on this device</span>
    </div>}
    {follow && <p className="zigi-checkin-follow">{follow.line}</p>}
    {status && <p role="status" className="fine">{status}</p>}
    <p className="zigi-checkin-actions"><button type="button" className="text-link" onClick={skip}>Skip today</button></p>
  </div>;
}
