'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {NO_AI_PHOTO} from './meal-photo-panel';
import {useHealthConsent} from '../ai/use-health-consent';
import {usePrivateStore} from '../use-private-store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, visibleDomains} from '../../lib/dashboard-settings';
import {readAiSettings} from '../../lib/ai/settings';
import {healthGate} from '../../lib/ai/gates';
import {readKey} from '../../lib/ai/keys';
import {currentAiScope} from '../../lib/ai/scope';
import {readCapability} from '../../lib/ai/capabilities';
import {photoAllowance, preparePhoto} from '../../lib/ai/photo';
import {streamChat} from '../../lib/ai/chat';
import {AiError, isAbortLike} from '../../lib/ai/errors';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {AI_USAGE_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {capNote, capState, monthKey, needsSpendConfirmation, readUsage, recordUsage} from '../../lib/ai/usage';
import {readDeviceRecord} from '../../lib/device-record';
import {getAppStorage} from '../../lib/showcase-storage';
import {labelScanRequest, runLabelScan} from '../../lib/label-scan/request';
import {READ_FROM_PHOTO, barcodeDraft, foodFormDraft, type BarcodeDraft, type FoodFormDraft} from '../../lib/label-scan/drafts';
import './label-scan.css';

/**
 * Session AK (COMPETITORS.md N1, item 3): "Read the label from a photo" in New food and on a barcode no database knows.
 * The same path and the same gates as a meal photo in ZIGi: the person's own AI (no AI connected: the meal photo's own
 * sentence), a model that reads photos, Health shared with ZIGi (the three-part gate), the monthly cap's "ask first". The
 * photo is shrunk on this device, sent with this one request only and never kept; the answer is checked (lib/label-scan)
 * and fills the form as an editable draft. Loaded only when the person opens it.
 */
type Props = {target: 'food-form'; onDraft: (draft: FoodFormDraft) => void} | {target: 'barcode-draft'; onDraft: (draft: Extract<BarcodeDraft, {ok: true}>) => void};
type State = {kind: 'idle'} | {kind: 'busy'; line: string} | {kind: 'done'; notes: string[]} | {kind: 'problem'; lines: string[]} | {kind: 'spend'; note: string; file: File};
export default function LabelScan(props: Props) {
  const id = useId(), take = useRef<HTMLInputElement>(null), choose = useRef<HTMLInputElement>(null), abort = useRef<AbortController | null>(null);
  const consent = useHealthConsent(), dashboard = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [state, setState] = useState<State>({kind: 'idle'});
  const settings = (() => { try { return readAiSettings(getAppStorage()).data; } catch { return null; } })();
  const connected = !!settings && settings.enabled && !!settings.provider && !!settings.model && settings.mode !== 'subscription';
  const layoutHasHealth = dashboard.loaded && !dashboard.error && visibleDomains(dashboard.data).includes('health');
  const healthOpen = !!settings && consent.loaded && healthGate({settings, layoutHasHealth, accountActive: consent.accountActive, accountHealthPermitted: consent.accountHealthPermitted});
  useEffect(() => () => abort.current?.abort(), []);

  async function read(file: File, spendConfirmed = false) {
    if (!settings || !connected) return;
    if (!spendConfirmed) {
      let cap = null; try { cap = capState(readUsage(getAppStorage()).data, monthKey(new Date())); } catch { cap = null; }
      if (needsSpendConfirmation(cap)) { setState({kind: 'spend', note: capNote(cap) ?? '', file}); return; }
    }
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setState({kind: 'busy', line: 'Preparing the photo on this device…'});
    try {
      const provider = settings.provider!, model = settings.model!;
      let key: string | null = null; try { key = await readKey(currentAiScope(), provider); } catch { key = null; }
      if (key === null && provider !== 'local') { setState({kind: 'problem', lines: ['Your key is not on this device.', 'Enter it again in Settings → ZIGi · Your Personal AI Companion. Keys stay on the device where you typed them; they are never synced.']}); return; }
      let declared: boolean | undefined; try { declared = readDeviceRecord(getAppStorage(), AI_OPTIONS).data.visionDeclared?.[`${provider}:${model}`]; } catch { declared = undefined; }
      const capability = declared === undefined ? await readCapability({provider, model, key, baseUrl: settings.baseUrl, localServer: settings.localServer, signal: controller.signal}).catch(() => null) : null;
      const allowed = photoAllowance({capability, declared, healthOpen});
      if (!allowed.allowed) { setState({kind: 'problem', lines: [allowed.reason]}); return; }
      const photo = await preparePhoto(file);
      setState({kind: 'busy', line: 'Your AI is reading the label…'});
      const out = await runLabelScan(labelScanRequest({settings, key, image: {mime: photo.mime, data: photo.data}, appOrigin: window.location.origin, signal: controller.signal}), streamChat);
      if (out.requests) { try { recordUsage(getAppStorage(), provider, out.usage ?? {input: null, output: null}, out.requests); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_USAGE_KEY})); } catch { /* the meter is a convenience */ } }
      if (controller.signal.aborted) return;
      if (!out.ok) { setState({kind: 'problem', lines: out.problems}); return; }
      if (props.target === 'food-form') { const d = foodFormDraft(out.label); props.onDraft(d); setState({kind: 'done', notes: d.notes}); return; }
      const d = barcodeDraft(out.label);
      if (!d.ok) { setState({kind: 'problem', lines: [d.reason]}); return; }
      props.onDraft(d); setState({kind: 'done', notes: d.notes});
    } catch (e) {
      if (controller.signal.aborted || isAbortLike(e)) { setState({kind: 'idle'}); return; }
      setState({kind: 'problem', lines: [e instanceof AiError || e instanceof Error ? e.message : 'The photo could not be read. Try again, or type the label.']});
    } finally { if (abort.current === controller) abort.current = null; }
  }
  const pick = (input: HTMLInputElement | null) => { const file = input?.files?.[0]; if (input) input.value = ''; if (file) void read(file); };

  if (!connected) return <div className="label-scan" role="group" aria-labelledby={`${id}-title`}>
    <p className="label-scan-title" id={`${id}-title`}>Read the label from a photo</p>
    <p>{NO_AI_PHOTO}</p><div className="actions"><Link className="secondary" href="/app/settings">Open Settings</Link></div>
  </div>;
  const busy = state.kind === 'busy';
  return <div className="label-scan" role="group" aria-labelledby={`${id}-title`} aria-busy={busy || undefined}>
    <p className="label-scan-title" id={`${id}-title`}>Read the label from a photo</p>
    <p className="fine">A photo of the nutrition table goes only to your own AI, which copies its numbers into the form for you to check. ZIGoals does not keep the photo.</p>
    <input ref={take} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} aria-hidden="true" onChange={e => pick(e.currentTarget)}/>
    <input ref={choose} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => pick(e.currentTarget)}/>
    <div className="actions">
      <button type="button" className="secondary" disabled={busy} onClick={() => take.current?.click()}>Take a photo</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => choose.current?.click()}>Choose a photo</button>
      {busy && <button type="button" className="quiet" onClick={() => { abort.current?.abort(); setState({kind: 'idle'}); }}>Stop</button>}
    </div>
    <div aria-live="polite">
      {state.kind === 'busy' && <p className="fine">{state.line}</p>}
      {state.kind === 'done' && <div className="label-scan-done"><p><strong>{READ_FROM_PHOTO}</strong>. Every field below stays yours to change; nothing is saved until you save.</p>{state.notes.length > 0 && <ul className="fine">{state.notes.map(n => <li key={n}>{n}</li>)}</ul>}</div>}
      {state.kind === 'problem' && <div className="label-scan-problem" role="alert"><p><strong>The label was not used.</strong></p><ul>{state.lines.map(l => <li key={l}>{l}</li>)}</ul></div>}
    </div>
    {state.kind === 'spend' && <div className="label-scan-problem"><p>{state.note}</p><div className="actions"><button type="button" className="secondary" onClick={() => void read(state.file, true)}>Send anyway</button><button type="button" className="quiet" onClick={() => setState({kind: 'idle'})}>Not now</button></div></div>}
  </div>;
}
