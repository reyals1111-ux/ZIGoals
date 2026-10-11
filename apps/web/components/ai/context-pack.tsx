'use client';
import {useMemo, useState} from 'react';
import {buildContextPack, DEFAULT_SCOPE, PACK_DAYS, PACK_WARNING, type PackScope} from '../../lib/ai/context-pack/build';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_REMINDERS} from '../../lib/ai/store/records';
import {exportFileName} from '../../lib/showcase-detect';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {useAiContext} from './use-ai-context';
import {useAiSettings} from './use-ai-settings';

/**
 * Settings → ZIGi · your AI → "Context pack for my AI" (Session V Part 5): choose the areas and the period, see the
 * size and the exact text, then download it (Markdown, or JSON) or copy it. Made on this device; nothing is sent
 * anywhere. Health needs its gate and its own box. The warning that the file is not encrypted comes before the buttons.
 * Loaded only when the person opens the card, so Settings carries none of it otherwise. Like "Export everything", it is
 * an explicit export of stored records, so the chat's pause for private forms (Settings always shows the sign-in form)
 * does not apply: it reads the stores, never the page.
 */
const AREAS: [keyof Omit<PackScope, 'days'>, string][] = [['habits', 'Habits'], ['goals', 'Goals'], ['wealth', 'Wealth'], ['health', 'Health'], ['notes', 'What ZIGi knows about me']];
export default function ContextPackPanel() {
  const settings = useAiSettings(), context = useAiContext(settings.data, 'your AI', false);
  const [scope, setScope] = useState<PackScope>(DEFAULT_SCOPE), [status, setStatus] = useState('');
  const [reminder, setReminder] = useState(() => { try { return !!readDeviceRecord(getAppStorage(), ZIGI_REMINDERS).data.packRefresh; } catch { return false; } });
  const sources = useMemo(() => context.toolSources(), [context]);
  const pack = useMemo(() => sources ? buildContextPack({sources, gates: context.gates, scope}) : null, [sources, context.gates, scope]);
  const healthOpen = context.gates.localHealth, hasNotes = !!sources?.notes?.length;
  const download = (kind: 'md' | 'json') => {
    if (!pack) return;
    const text = kind === 'md' ? pack.markdown : `${JSON.stringify(pack.json, null, 2)}\n`;
    const url = URL.createObjectURL(new Blob([text], {type: kind === 'md' ? 'text/markdown;charset=utf-8' : 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = exportFileName(`zigoals-context-pack-${pack.range.to}.${kind}`, isShowcase()); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Your context pack is downloading. Keep it private, and make a new one when your records change.');
  };
  const copy = () => { if (pack) navigator.clipboard?.writeText(pack.markdown).then(() => setStatus('Copied. Paste it into your AI\'s project knowledge.')).catch(() => setStatus('Copying was not allowed here; use Download instead.')); };
  const remind = (on: boolean) => {
    try { updateDeviceRecord(getAppStorage(), ZIGI_REMINDERS, current => ({...current, packRefresh: on ? {weekday: new Date().getDay(), time: '18:00'} : null})); setReminder(on); setStatus(on ? 'ZIGi will remind you on this weekday each week, at 18:00.' : 'The weekly reminder is off.'); }
    catch { setStatus('The reminder could not be saved on this device.'); }
  };
  if (!pack) return <p className="ai-note" role="status">Reading your records…</p>;
  return <div className="ai-pack-body">
    <fieldset className="ai-pack-areas"><legend>What goes in</legend>
      {AREAS.filter(([key]) => key !== 'notes' || hasNotes).map(([key, label]) => <label key={key} className="ai-check"><input type="checkbox" checked={scope[key]} disabled={key === 'health' && !healthOpen} onChange={e => setScope(s => ({...s, [key]: e.target.checked}))}/> {label}{key === 'health' && <small> {healthOpen ? 'Off unless you tick it.' : 'Needs Include Health (below the page switches) and Health on Today first.'}</small>}</label>)}
    </fieldset>
    <label className="field">Period<select value={scope.days} onChange={e => setScope(s => ({...s, days: Number(e.target.value) as PackScope['days']}))}>{PACK_DAYS.map(d => <option key={d} value={d}>The last {d} days</option>)}</select></label>
    <p className="ai-note">About {pack.estimatedTokens.toLocaleString('en-US')} tokens · {pack.included.length ? pack.included.join(', ') : 'nothing chosen'}{pack.omitted.length ? ` · not included: ${pack.omitted.join('; ')}` : ''}.</p>
    <p className="ai-pack-warning" role="note"><strong>{PACK_WARNING}</strong> Add it only to an AI you trust, and only the parts you want it to know.</p>
    <details className="ai-context-preview"><summary>Preview the exact text</summary><pre>{pack.markdown.length > 40_000 ? `${pack.markdown.slice(0, 40_000)}\n… (the full text is in the download)` : pack.markdown}</pre></details>
    <div className="ai-card-actions">
      <button type="button" className="primary" onClick={() => download('md')} disabled={!pack.included.length}>Download (.md)</button>
      <button type="button" className="secondary" onClick={() => download('json')} disabled={!pack.included.length}>Download as JSON</button>
      <button type="button" className="secondary" onClick={copy} disabled={!pack.included.length}>Copy</button>
    </div>
    <label className="ai-check"><input type="checkbox" checked={reminder} onChange={e => remind(e.target.checked)}/> Remind me each week to make a new one (this device only)</label>
    {status && <p className="ai-note" role="status">{status}</p>}
  </div>;
}
