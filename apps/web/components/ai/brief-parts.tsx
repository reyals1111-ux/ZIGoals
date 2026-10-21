'use client';
import {useEffect, useState} from 'react';
import {briefLines, type Brief} from '../../lib/ai/proactive/brief';
import {ZIGI, zigiPrefs} from '../../lib/ai/store/records';
import {ZIGI_VOICE, voicePrefs} from '../../lib/zigi-voice';
import {useDeviceRecord} from './use-device-record';
import {useReadAloud} from './use-voice';

/**
 * Session AF (L4, P8.2): the parts the morning brief and the evening recap share, on Today's card and in ZIGi's panel.
 * The v2 sections as a labelled list (each part with its name); "Read aloud", which speaks the brief once on a tap and
 * never by itself (not while ZIGi is muted, not in ZIGi's quiet hours); and a clock that moves every half minute, so the
 * recap appears when its time comes.
 */
export function BriefSections({brief}: {brief: Brief}) {
  if (!brief.sections?.length) return null;
  return <dl className="ai-brief-sections">{brief.sections.map(s => <div key={s.id} className="ai-brief-section" data-section={s.id}><dt>{s.label}</dt><dd>{s.text}</dd></div>)}</dl>;
}
export const localClock = (now: Date) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
/** Whether a clock time falls in quiet hours that may run past midnight ("22:00" to "08:00"). */
export function inQuiet(clock: string, from: string, to: string): boolean { return from <= to ? clock >= from && clock < to : clock >= from || clock < to; }
export function useBriefClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); queueMicrotask(tick); const t = window.setInterval(tick, 30_000); return () => window.clearInterval(t); }, []);
  return now;
}
export function ReadAloudButton({brief, intro}: {brief: Brief; intro: string}) {
  const reader = useReadAloud('en-GB'), zigi = useDeviceRecord(ZIGI), voice = useDeviceRecord(ZIGI_VOICE), now = useBriefClock();
  if (!reader.supported) return null;
  const prefs = zigiPrefs(zigi.data), muted = voicePrefs(voice.data).muted, quiet = now ? inQuiet(localClock(now), prefs.knock.quietFrom, prefs.knock.quietTo) : false;
  if (muted || quiet) return <span className="ai-note ai-brief-quiet">{muted ? 'Read aloud: ZIGi is muted.' : 'Read aloud rests in quiet hours.'}</span>;
  return reader.speaking ? <button type="button" className="text-link" onClick={reader.stop}>Stop reading</button>
    : <button type="button" className="text-link" onClick={() => reader.speak([intro, ...briefLines(brief)].join('\n'))}>Read aloud</button>;
}
