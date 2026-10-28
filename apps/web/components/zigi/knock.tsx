'use client';
import {usePathname, useRouter} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {knockFor, knockLines, recordKnock, snooze, snoozeUntil, SNOOZE_LABELS, type KnockCandidate, type SnoozeChoice} from '../../lib/ai/knock/rules';
import {ZIGI, ZIGI_KNOCK, ZIGI_REMINDERS, zigiPrefs} from '../../lib/ai/store/records';
import {localDate} from '../../lib/local-date';
import type * as KnockCompute from '../../lib/ai/knock/compute';
import {ZigiPartBoundary} from './part-boundary';
import {isShowcase} from '../../lib/showcase-storage';
import {ZigiAvatar} from './zigi-avatar';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {MEDITATION_RUN} from '../../lib/meditation/schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useReminders} from '../reminders/use-reminders';
import {zigiSignals, zigiState} from './bus';
import {zigiAliveRunning, zigiController} from './alive';
import './knock.css';

/**
 * ZIGi's knock (Session V Part 13): with knocking on, a reminder that is due makes ZIGi peek out above its button and
 * knock once: the reminder's name and time, then "Do it now", "Snooze" or "Not today". A habit gets its check-in card
 * (added only when the person adds it), water opens the water journal, a goal its page, the weekly looks their place.
 * The rules (lib/ai/knock/rules.ts): quiet hours, a daily cap, one knock per reminder a day unless snoozed, never on
 * Today (its own cards show there). This component adds the rest: never while ZIGi is hidden, on a sensitive screen or
 * with the panel open. It reads the device's records, sends nothing, and writes only the knock counts, a snooze or a
 * dismissal the person chose. Nothing moves under reduced motion, Motion Off or ZIGi's animation Off.
 */
const KnockCheckIn = lazy(() => import('./knock-check-in'));
const TICK_MS = 30_000, REST_MS = 10 * 60_000, RIPPLE_MS = 1200;
export function ZigiKnock({away, phone, side}: {away: boolean; phone: boolean; side: 'right' | 'left'}) {
  const reminders = useReminders(), habits = useHabits(), health = useHealth(), platform = usePlatform(), legacy = useGoals();
  const zigi = useDeviceRecord(ZIGI), knock = useDeviceRecord(ZIGI_KNOCK), zigiReminders = useDeviceRecord(ZIGI_REMINDERS), wReminders = useDeviceRecord(W_REMINDERS), meditationRun = useDeviceRecord(MEDITATION_RUN);
  const pathname = usePathname() ?? '', router = useRouter(), titleId = useId();
  const [now, setNow] = useState<Date | null>(null), [current, setCurrent] = useState<KnockCandidate | null>(null), [mode, setMode] = useState<'ask' | 'snooze' | 'check-in'>('ask'), [note, setNote] = useState('');
  const restUntil = useRef(0);
  useEffect(() => {
    const tick = () => setNow(new Date());
    queueMicrotask(tick);
    const timer = window.setInterval(tick, TICK_MS);
    // A push that arrives while the page is open knocks at once (the notification shows as well: ADR-014).
    const onMessage = (event: MessageEvent) => { if (event.data?.type === 'zigoals:push-reminder') tick(); };
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    navigator.serviceWorker?.addEventListener('message', onMessage); document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); navigator.serviceWorker?.removeEventListener('message', onMessage); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const legacyNames = useMemo(() => Object.fromEntries(legacy.goals.map(g => [g.id, legacy.metadata?.goals?.[g.id]?.name ?? `Goal #${g.id}`])), [legacy.goals, legacy.metadata]);
  const ready = reminders.loaded && zigi.loaded && knock.loaded && zigiReminders.loaded && wReminders.loaded;
  // Gate A (ADR-022 B41): the due rules live in their own chunk, loaded once the shell is on screen.
  const [compute, setCompute] = useState<typeof KnockCompute | null>(null);
  // Session AI (B1 CI): a load that fails (a cancelled request) is tried once more a second later, so one failed fetch
  // never leaves this page without its knock.
  useEffect(() => {
    let on = true, timer: ReturnType<typeof setTimeout> | null = null;
    const load = (retry: boolean) => void import('../../lib/ai/knock/compute').then(m => { if (on) setCompute(m); }).catch(() => { if (on && retry) timer = setTimeout(() => load(false), 1000); });
    load(true);
    return () => { on = false; if (timer) clearTimeout(timer); };
  }, []);
  const candidates = useMemo<KnockCandidate[]>(() => {
    if (!now || !ready || !compute) return [];
    return compute.knockCandidates({reminders: reminders.data, habits: habits.data, health: health.data, w: wReminders.unreadable ? null : wReminders.data, meditationRunning: !!meditationRun.data.run, platform: platform.data, zigiReminders: zigiReminders.data, legacyNames, now});
  }, [compute, now, ready, reminders.data, habits.data, health.data, zigiReminders.data, wReminders.data, wReminders.unreadable, meditationRun.data.run, platform.data, legacyNames]);
  const prefs = zigiPrefs(zigi.data).knock;
  // Today shows every due reminder as its own card, so ZIGi never knocks there.
  const next = useMemo(() => {
    if (!now || current || away || pathname === '/app' || now.getTime() < restUntil.current) return null;
    // Session X-Local Part 4: the companion controller's nudge rules (one per session, none after a dismissal, none in
    // quiet hours, none while the person types, none on a sensitive screen) are asked before a knock counts.
    if (zigiController.nudgeAllowed(now.getTime()) !== 'allowed') return null;
    return knockFor({candidates, prefs, state: knock.data, now, day: localDate(now)});
  }, [now, current, away, pathname, candidates, prefs, knock.data]);
  useEffect(() => {
    if (!next || !now) return;
    setCurrent(next); setMode('ask'); setNote('');
    try { knock.update(state => recordKnock(state, next.id, localDate(now), now)); } catch { /* the counts are a convenience; the knock shows */ }
    // ZIGi's button shows the knock too, then rests: the signal goes through the controller (it counts the nudge), and
    // the state is set directly as well in case the alive chunk has not started yet.
    // Phase 2 (P2.5, found by the simulated-day spec): before the alive chunk runs, the signal reaches no controller and the
    // nudge went uncounted, so a second due reminder could knock in the same session; the knock then counts it itself.
    if (zigiAliveRunning()) zigiSignals.emit('reminder_due'); else zigiController.dispatch({type: 'reminder_due'}, now.getTime());
    if (zigiState.get() !== 'reminder') zigiState.set('reminder');
    const root = document.documentElement; root.dataset.zigiKnock = '';
    window.setTimeout(() => { delete root.dataset.zigiKnock; if (zigiState.get() === 'reminder') zigiState.set('idle'); }, RIPPLE_MS * 2);
  }, [next]); // eslint-disable-line react-hooks/exhaustive-deps -- one knock per chosen reminder
  const close = useCallback(() => { setCurrent(null); restUntil.current = Date.now() + REST_MS; }, []);
  /** Closing the knock without acting on it is a dismissal: no more nudges this session (the controller's rule). */
  const dismiss = useCallback(() => { zigiSignals.emit('user_dismissed'); close(); }, [close]);
  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && (event.target as Element | null)?.closest?.('.zigi-knock')) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);
  if (!current || away) return null;
  const doIt = () => {
    if (current.kind === 'habit') { setMode('check-in'); return; }
    close(); router.push(current.href);
  };
  const notToday = () => {
    try {
      if (!compute) throw new Error('not loaded');
      compute.dismissCandidate(current, {reminders, w: wReminders, zigi: zigiReminders});
      dismiss();
    } catch { setNote('This could not be saved on this device; the reminder stays for now.'); }
  };
  const snoozeFor = (choice: SnoozeChoice) => {
    const at = new Date(), until = snoozeUntil(choice, at, prefs); if (!until) return;
    // A snooze is the person's own request for the knock to return: the controller allows one more nudge (Part 4).
    try { knock.update(state => snooze(state, current.id, until, at)); zigiController.grant(); close(); }
    catch { setNote('The snooze could not be saved on this device.'); }
  };
  const choices = (['15m', '1h', 'tonight'] as const).filter(c => snoozeUntil(c, now ?? new Date(), prefs) !== null);
  const lines = knockLines(current);
  return <section className={`zigi-knock${phone ? ' zigi-knock-phone' : ''}`} data-side={side} aria-labelledby={titleId}>
    <div className="zigi-knock-head">
      <ZigiAvatar state="reminder" size={44} decorative/>
      <div className="zigi-knock-copy">
        {isShowcase() && <p className="zigi-knock-label">Showcase · fictional</p>}
        <h2 id={titleId}>{lines.title}</h2>
        <p>{lines.line}</p>
      </div>
      <button type="button" className="zigi-knock-close" aria-label="Close ZIGi's reminder" onClick={dismiss}>×</button>
    </div>
    <p className="zigi-knock-live" role="status">{`ZIGi: ${lines.title}. ${lines.line}.`}</p>
    {mode === 'ask' && <div className="zigi-knock-actions">
      <button type="button" className="primary" onClick={doIt}>{current.kind === 'habit' ? 'Do it now' : lines.action}</button>
      <button type="button" className="secondary" onClick={() => setMode('snooze')}>Snooze</button>
      <button type="button" className="quiet" onClick={notToday}>Not today</button>
    </div>}
    {mode === 'snooze' && <div className="zigi-knock-actions" role="group" aria-label="Snooze for">
      {choices.map(choice => <button key={choice} type="button" className="secondary" onClick={() => snoozeFor(choice)}>{SNOOZE_LABELS[choice]}</button>)}
      <button type="button" className="quiet" onClick={() => setMode('ask')}>Back</button>
    </div>}
    {mode === 'check-in' && <ZigiPartBoundary label="The check-in"><Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><KnockCheckIn habitId={current.id} title={current.title} onNavigate={close}/></Suspense></ZigiPartBoundary>}
    {note && <p role="alert" className="zigi-knock-note">{note}</p>}
  </section>;
}
