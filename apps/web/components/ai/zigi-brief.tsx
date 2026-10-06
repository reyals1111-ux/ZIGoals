'use client';
import {useEffect, useMemo, useRef} from 'react';
import {morningBrief, type Brief} from '../../lib/ai/proactive/brief';
import {BRIEF_ID, dismissedOn, dismissFor} from '../../lib/ai/proactive/dismiss';
import {ZIGI, zigiPrefs} from '../../lib/ai/store/records';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {toolEnv} from '../../lib/ai/tools/env';
import {getAppStorage} from '../../lib/showcase-storage';
import {askZigi} from './ask';
import {BriefLines} from './proactive';
import {useAiContext} from './use-ai-context';
import {useAiSettings} from './use-ai-settings';
import {useDeviceRecord} from './use-device-record';
import './ai.css';

/**
 * ZIGi's morning brief on Today (Session V Part 9): a "For you" card at the lowest priority, so the max-two rule and the
 * other cards stay as they are. Loaded only while ZIGi is on and its launcher shows; made on this device (Health only
 * through its gate); shown only when there is something to say and the person did not hide it today; nothing written
 * on view ("Not today" is the only write).
 */
export type DayBrief = {brief: Brief; day: string};
export function BriefProbe({onBrief}: {onBrief: (brief: DayBrief | null) => void}) {
  const settings = useAiSettings(), {toolSources, gates} = useAiContext(settings.data, 'your AI', false), zigi = useDeviceRecord(ZIGI);
  // Made again only when the records, the gates or the ZIGi record change (the context object itself is new on every
  // render), and passed up only when its words change: a new object for the same brief would re-render Today, which
  // re-renders this probe, without end (found by Part 9's spec: the endless updates starved the chat's own loading).
  const brief = useMemo<DayBrief | null>(() => {
    if (!zigi.loaded || zigiPrefs(zigi.data).greeting === 'quiet') return null;
    const sources = toolSources(); if (!sources) return null;
    if (dismissedOn(zigi.data, sources.habitDay).has(BRIEF_ID)) return null;
    const made = morningBrief(toolEnv(sources, gates, 'local'));
    return made ? {brief: made, day: sources.habitDay} : null;
  }, [toolSources, gates, zigi.loaded, zigi.data]);
  const sent = useRef<string | null>(null);
  useEffect(() => { const key = JSON.stringify(brief); if (key === sent.current) return; sent.current = key; onBrief(brief); }, [brief, onBrief]);
  return null;
}
export function BriefCard({brief, day}: DayBrief) {
  const hide = () => { try { dismissFor(getAppStorage(), day, BRIEF_ID); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_KEY})); } catch { /* it stays; nothing else changes */ } };
  return <article className="panel zigi-brief-card" aria-label="ZIGi's morning brief">
    <p className="eyebrow">ZIGI · YOUR DAY</p>
    <BriefLines brief={brief}/>
    <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => askZigi('')}>Open ZIGi</button><button type="button" className="text-link" onClick={hide}>Not today</button></div>
  </article>;
}
