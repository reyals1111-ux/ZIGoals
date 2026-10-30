'use client';
import {useEffect, useMemo, useRef} from 'react';
import {BRIEF_WHY, eveningRecap, morningBrief, recapDue, type Brief} from '../../lib/ai/proactive/brief';
import '../journal/journal.css';
import {BRIEF_ID, dismissedOn, dismissFor} from '../../lib/ai/proactive/dismiss';
import {briefPrefs, ZIGI, zigiPrefs} from '../../lib/ai/store/records';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {toolEnv} from '../../lib/ai/tools/env';
import {getAppStorage} from '../../lib/showcase-storage';
import {askZigi} from './ask';
import {BriefLines, RecapLines} from './proactive';
import {localClock, ReadAloudButton, useBriefClock} from './brief-parts';
import {useAiContext} from './use-ai-context';
import {useAiSettings} from './use-ai-settings';
import {useDeviceRecord} from './use-device-record';
import {zigiSignals} from '../zigi/bus';
import {lastEntryDay, welcomeBack} from '../../lib/checkin/checkin';
import {ZigiCheckIn} from './zigi-checkin';
import './ai.css';

/**
 * ZIGi's morning brief on Today (Session V Part 9): a "For you" card at the lowest priority, so the max-two rule and the
 * other cards stay as they are. Loaded only while ZIGi is on and its launcher shows; made on this device (Health only
 * through its gate); shown only when there is something to say and the person did not hide it today; nothing written
 * on view ("Not today" is the only write).
 *
 * Session AF (L4, P8.2): Daily Briefing v2 — the brief gains its sections (today's Checklist dots, meals planned, timers
 * running, goals needing a step, the earning summary, a note the person keeps) — and the Evening Recap, from the time the
 * person chose (18:00 by default) until they hide it for the day, in the same card's place. Each has "Read aloud" (on a
 * tap, never by itself), "Open ZIGi" and "Not today". The morning brief and the recap can each be turned off in Settings
 * → ZIGi · Your day (`zigoals:zigi:v1` `brief`).
 */
export const RECAP_ID = 'recap';
export type DayBrief = {brief: Brief | null; day: string; recap?: Brief | null; /** Session AJ: back after 7 days or more without an entry. */ back?: boolean};
export function BriefProbe({onBrief}: {onBrief: (brief: DayBrief | null) => void}) {
  const settings = useAiSettings(), {toolSources, gates} = useAiContext(settings.data, 'your AI', false), zigi = useDeviceRecord(ZIGI), now = useBriefClock();
  // Made again only when the records, the gates, the ZIGi record or the half-minute clock change (the context object
  // itself is new on every render), and passed up only when its words change: a new object for the same brief would
  // re-render Today, which re-renders this probe, without end (found by Part 9's spec: the endless updates starved the
  // chat's own loading).
  const due = now ? recapDue(localClock(now), briefPrefs(zigi.data).eveningTime) : false;
  const brief = useMemo<DayBrief | null>(() => {
    if (!zigi.loaded || zigiPrefs(zigi.data).greeting === 'quiet') return null;
    const sources = toolSources(); if (!sources) return null;
    const prefs = briefPrefs(zigi.data), hidden = dismissedOn(zigi.data, sources.habitDay), env = toolEnv(sources, gates, 'local'), extras = {snapshot: sources.earn, earning: prefs.earning};
    const morning = prefs.morning && !hidden.has(BRIEF_ID) ? morningBrief(env, extras) : null;
    const recap = prefs.evening && due && !hidden.has(RECAP_ID) ? eveningRecap(env, extras) : null;
    const last = lastEntryDay(sources.habits, sources.health, sources.habitDay), back = !!last && last < sources.habitDay && welcomeBack(last, sources.habitDay);
    return morning || recap ? {brief: morning, day: sources.habitDay, ...(recap ? {recap} : {}), ...(back ? {back} : {})} : null;
  }, [toolSources, gates, zigi.loaded, zigi.data, due]);
  const sent = useRef<string | null>(null);
  useEffect(() => { const key = JSON.stringify(brief); if (key === sent.current) return; sent.current = key; onBrief(brief); }, [brief, onBrief]);
  return null;
}
function hideFor(day: string, id: string) {
  try { dismissFor(getAppStorage(), day, id); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_KEY})); } catch { /* it stays; nothing else changes */ }
}
export function BriefCard({brief, day, recap, back = false}: DayBrief) {
  // One root for the For-you slot (a layout item keeps one DOM root): the recap, once its time has come, sits above the morning brief.
  return <div className="zigi-brief-stack">
    {recap && <article className="panel zigi-brief-card zigi-recap-card" aria-label="ZIGi's evening recap">
      <p className="eyebrow">ZIGI · YOUR EVENING</p>
      <RecapLines recap={recap}/>
      <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => askZigi('')}>Open ZIGi</button><button type="button" className="text-link" onClick={() => hideFor(day, RECAP_ID)}>Not today</button></div>
    </article>}
    {brief && <article className="panel zigi-brief-card" aria-label="ZIGi's morning brief">
      <p className="eyebrow">ZIGI · YOUR DAY</p>
      {back && <WelcomeBack/>}
      <BriefLines brief={brief} footer={<ReadAloudButton brief={brief} intro="Your morning brief."/>}/>
      <details className="zigi-brief-why"><summary>Why these lines?</summary><ul className="fine">{(['due', 'win', 'focus'] as const).filter(k => brief[k]).map(k => <li key={k}>{BRIEF_WHY[k]}</li>)}</ul><p className="fine">Made on this device from your own records by these rules; no AI used.</p></details>
      <ZigiCheckIn day={day}/>
      <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => askZigi('')}>Open ZIGi</button><button type="button" className="text-link" onClick={() => hideFor(day, BRIEF_ID)}>Not today</button></div>
    </article>}
  </div>;
}

/**
 * Session AJ (item 10; COMPANIONS.md P4 moment 7): back after 7 days or more without a single entry (and none yet today),
 * ZIGi says "Welcome back" and never how long it was. Read from the person's own records, so nothing is written on view;
 * it goes once they log anything today.
 */
function WelcomeBack() {
  const cheered = useRef(false);
  useEffect(() => { if (cheered.current) return; cheered.current = true; zigiSignals.emit('hint_encouraging'); }, []);
  return <p className="zigi-welcome-back">Welcome back. Good to see you.</p>;
}
