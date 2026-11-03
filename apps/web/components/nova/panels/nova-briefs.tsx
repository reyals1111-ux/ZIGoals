'use client';
import {useEffect, useMemo, useState} from 'react';
import {recapDue, type Brief} from '../../../lib/ai/proactive/brief';
import {briefPrefs, ZIGI} from '../../../lib/ai/store/records';
import {acceptReword, briefForModel, composeBrief, latestBriefs, markAllRead, markRead, NOVA_BRIEFS, novaBriefPrefs, rewordMessage, REWORD_SYSTEM, saveBrief, setNovaBriefPrefs, unreadCount, withReword, type BriefScopes, type NovaBrief} from '../../../lib/nova/briefs';
import {NOTIFY_PREFS, typeOn} from '../../../lib/notify/prefs';
import {isShowcase} from '../../../lib/showcase-storage';
import {formatDate} from '../../../lib/visual-format';
import {localClock, ReadAloudButton, useBriefClock} from '../../ai/brief-parts';
import {SafeText} from '../../ai/safe-text';
import {Switch} from '../../ai/ai-switch';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useNovaModel} from '../workflows/use-nova-model';
import {useNovaSources} from '../workflows/use-nova-sources';
import '../../ai/ai.css';
import './panels.css';

/**
 * NOVA's morning brief and evening recap (Session AK, owner follow-up 2 N6, N3 step 8): composed on this device from the
 * person's records inside their scopes (ZIGi's rules plus NOVA's money line), kept as the last 30 with their read state
 * (`zigoals:nova-briefs:v1`), from the evening time ZIGi's "Your day" sets. A model may only reword one, on a tap: a local
 * model always, a cloud model only in Guarded or Relaxed; a rewording that changes a number is not shown. "Tell me when a
 * brief is ready" exists only while notifications are already on here (the notification plan reads `briefNotice`).
 */
/** The scopes a brief reads (it never reads notes or the journal). */
const SCOPE_LABELS: Partial<Record<keyof BriefScopes, string>> = {today: 'Today', goals: 'Goals', habits: 'Habits', wealth: 'Wealth', health: 'Health', earn: 'Earn'};
const asBrief = (b: NovaBrief): Brief => ({due: null, win: null, focus: null, lines: [...b.lines], sections: (b.sections ?? []).map(s => ({id: s.id as never, label: s.label, text: s.text}))});
export function NovaBriefs() {
  const sources = useNovaSources(), record = useDeviceRecord(NOVA_BRIEFS), zigi = useDeviceRecord(ZIGI), notify = useDeviceRecord(NOTIFY_PREFS), model = useNovaModel('briefs'), now = useBriefClock();
  const [busy, setBusy] = useState<string | null>(null), [note, setNote] = useState<{text: string; failed?: boolean} | null>(null);
  const env = sources.local?.env ?? null, prefs = briefPrefs(zigi.data), due = now ? recapDue(localClock(now), prefs.eveningTime) : false;
  const composed = useMemo(() => {
    if (!env || !zigi.loaded) return [];
    const extras = {snapshot: env.earn ?? null, earning: prefs.earning};
    return [composeBrief('morning', env.habitDay, env, {scopes: sources.scopes, extras}), due ? composeBrief('evening', env.habitDay, env, {scopes: sources.scopes, extras}) : null].filter((b): b is NovaBrief => !!b);
  }, [env, zigi.loaded, prefs.earning, due, sources.scopes]);
  // Kept when its words are new (a brief that says the same is not written again).
  useEffect(() => {
    if (!record.loaded || record.unreadable || !composed.length) return;
    const current = record.data;
    if (!composed.some(b => saveBrief(current, b).changed)) return;
    try { record.update(latest => composed.reduce((r, b) => saveBrief(r, b).record, latest)); } catch { /* shown, just not kept */ }
  }, [composed, record]);
  const today = env?.habitDay ?? null, stored = latestBriefs(record.data, 7), unread = today ? unreadCount(record.data, today) : 0;
  const list = stored.length ? stored : composed;
  const save = (change: Parameters<typeof record.update>[0], text?: string) => { try { record.update(change); if (text) setNote({text}); } catch { setNote({text: 'Not saved on this device.', failed: true}); } };
  const reword = async (brief: NovaBrief) => {
    if (!model.ask || !model.route) return;
    // Security review Z1A-9: only the copy built from what may go to the model (ZIGi's share switches, Health's gate, NOVA's
    // scopes) is sent and checked, never the on-device brief on screen.
    const sent = briefForModel(brief, sources.send?.env ?? null, {scopes: sources.scopes, extras: {snapshot: sources.send?.env.earn ?? null, earning: prefs.earning}});
    if (!sent) { setNote({text: 'Nothing in this brief may go to your model under your sharing choices, so it stays as NOVA wrote it on this device.', failed: true}); return; }
    setBusy(brief.id); setNote(null);
    try {
      const reply = await model.ask({system: REWORD_SYSTEM, user: rewordMessage(sent)}), text = acceptReword(sent, reply);
      if (!text) { setNote({text: 'Your model changed a number or said too much, so its wording is not shown. The brief above is exactly your records.', failed: true}); return; }
      save(current => withReword(current, brief.id, {text, by: model.route!, model: model.model ?? 'model'}, new Date()));
    } catch (error) { setNote({text: error instanceof Error ? error.message : 'Your model did not answer.', failed: true}); }
    finally { setBusy(null); }
  };
  const notifyHere = notify.loaded && notify.data.here === true, bell = novaBriefPrefs(record.data).notify;
  const closed = (Object.keys(SCOPE_LABELS) as (keyof BriefScopes)[]).filter(k => !sources.scopes[k]).map(k => SCOPE_LABELS[k]!);
  return <section className="panel nova-briefs" id="briefs" aria-labelledby="nova-briefs-title">
    <div className="nova-panel-head">
      <div><p className="eyebrow">MADE ON THIS DEVICE</p><h3 id="nova-briefs-title">Your briefs{unread ? <span className="nova-panel-badge"> · {unread} unread</span> : null}</h3></div>
      {unread > 0 && <button type="button" className="text-link" onClick={() => save(current => markAllRead(current, new Date()), 'All briefs are marked read.')}>Mark all read</button>}
    </div>
    {isShowcase() && <p className="ai-note">Showcase: made from fictional example records.</p>}
    <p className="ai-note">A morning brief, and from {prefs.eveningTime} an evening recap, from your own records by ZIGi&rsquo;s rules; no AI is needed.{closed.length ? ` Not read: ${closed.join(', ')} (Permissions).` : ''}</p>
    {!sources.ready && <p className="ai-note" role="status">Reading your records…</p>}
    {sources.ready && !list.length && <div className="nova-panel-empty"><p><strong>Nothing to brief yet.</strong></p><p className="ai-note">Add a habit, a goal or a meal plan, or log your spending, and NOVA writes your morning brief and evening recap here each day, on this device. Load the Showcase in Settings to see one with example records.</p></div>}
    {list.length > 0 && <ul className="nova-brief-list">{list.map(b => {
      const fresh = !b.readAt;
      return <li key={b.id}><details className="nova-brief" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open && fresh && stored.some(s => s.id === b.id)) save(current => markRead(current, b.id, new Date())); }}>
        <summary><span>{b.kind === 'morning' ? 'Morning brief' : 'Evening recap'} · {formatDate(b.day)}</span>{fresh && <span className="nova-panel-badge">Unread</span>}</summary>
        <div className="nova-brief-body">
          {b.lines.length > 0 && <ul className="nova-brief-lines">{b.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
          {(b.sections?.length ?? 0) > 0 && <dl className="ai-brief-sections">{b.sections!.map(s => <div key={s.id} className="ai-brief-section"><dt>{s.label}</dt><dd>{s.text}</dd></div>)}</dl>}
          {b.polished && <div className="nova-brief-polished"><p className="eyebrow">WORDED BY {b.polished.by === 'local' ? 'YOUR LOCAL MODEL' : 'YOUR CLOUD MODEL'} · {b.polished.model}</p><SafeText text={b.polished.text}/></div>}
          <div className="ai-card-actions">
            <ReadAloudButton brief={asBrief(b)} intro={b.kind === 'morning' ? 'Your morning brief.' : 'Your evening recap.'}/>
            {model.ask && b.day === today && <button type="button" className="secondary" disabled={busy !== null} onClick={() => void reword(b)}>{busy === b.id ? 'Asking your model…' : 'Say it in warmer words'}</button>}
          </div>
        </div>
      </details></li>;
    })}</ul>}
    {!model.ask && list.length > 0 && <p className="ai-note">{model.why}</p>}
    {notifyHere ? <Switch checked={bell} onChange={next => save(current => setNovaBriefPrefs(current, {notify: next}), next ? 'Your morning and evening notifications open your NOVA briefs.' : 'Your notifications open Today as before.')} label="Open my briefs from notifications"
      note={typeOn(notify.data, 'morning') || typeOn(notify.data, 'evening') ? 'A tap on your morning or evening notification opens these briefs. The notification names nothing from your records.' : 'Your morning and evening notifications are off in Settings → Notifications; turn one on to use this.'}/>
      : <p className="ai-note">To be told when a brief is ready, turn on notifications in Settings → Notifications first.</p>}
    {note && <p role={note.failed ? 'alert' : 'status'} className="ai-note">{note.text}</p>}
  </section>;
}
export default NovaBriefs;
