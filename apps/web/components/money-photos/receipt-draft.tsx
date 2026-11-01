'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {readAiSettings} from '../../lib/ai/settings';
import {readKey} from '../../lib/ai/keys';
import {currentAiScope} from '../../lib/ai/scope';
import {readCapability} from '../../lib/ai/capabilities';
import {preparePhoto} from '../../lib/ai/photo';
// Security review Z1A-1: the engine's privacy hook on this photo too (Strict keeps it here; Guarded sends no photo to a cloud).
import {guardedStreamChat} from '../../lib/ai/guarded-stream';
import {PhotoSendConfirm} from '../ai/photo-send-confirm';
import {AiError, isAbortLike} from '../../lib/ai/errors';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {AI_USAGE_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {capNote, capState, monthKey, needsSpendConfirmation, readUsage, recordUsage} from '../../lib/ai/usage';
import {readDeviceRecord} from '../../lib/device-record';
import {getAppStorage} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {receiptRequest, runReceiptRead} from '../../lib/money-photos/receipt-read';
import {sendMoneyDraft} from './draft-event';

/**
 * Session AK (BUILD list 2 #10): "Draft an entry from a receipt", through the person's own AI only, on the label-scan
 * path (components/health/label-scan.tsx): their provider, model and key, the monthly cap's "ask first", a model that
 * reads photos, and Wealth shared with ZIGi (Settings → ZIGi → Share this page's data: Wealth). The photo is shrunk on
 * this device and sent with this one request only; ZIGoals does not keep it here. The answer fills the Spending form as
 * a draft; nothing is saved until the person taps Save. Loaded only when opened.
 */
type State = {kind: 'idle'} | {kind: 'busy'; line: string} | {kind: 'done'; notes: string[]} | {kind: 'problem'; lines: string[]} | {kind: 'spend'; note: string; file: File} | {kind: 'confirm'; file: File};
export default function ReceiptDraft() {
  const id = useId(), take = useRef<HTMLInputElement>(null), choose = useRef<HTMLInputElement>(null), abort = useRef<AbortController | null>(null);
  const [state, setState] = useState<State>({kind: 'idle'});
  const settings = (() => { try { return readAiSettings(getAppStorage()).data; } catch { return null; } })();
  const connected = !!settings && settings.enabled && !!settings.provider && !!settings.model && settings.mode !== 'subscription';
  const wealthShared = !!settings && settings.pageShare.wealth;
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
      const reads = declared ?? capability?.vision ?? null;
      if (reads !== true) { setState({kind: 'problem', lines: [reads === false ? 'Your model does not read photos.' : 'Turn on "This model reads photos" in Settings → ZIGi · Your Personal AI Companion if your model does.']}); return; }
      const photo = await preparePhoto(file);
      setState({kind: 'busy', line: 'Your AI is reading the receipt…'});
      const out = await runReceiptRead(receiptRequest({settings, key, image: {mime: photo.mime, data: photo.data}, appOrigin: window.location.origin, signal: controller.signal}), guardedStreamChat, localDate());
      if (out.requests) { try { recordUsage(getAppStorage(), provider, out.usage ?? {input: null, output: null}, out.requests); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_USAGE_KEY})); } catch { /* the meter is a convenience */ } }
      if (controller.signal.aborted) return;
      if (!out.ok) { setState({kind: 'problem', lines: out.problems}); return; }
      sendMoneyDraft({...(out.draft.amount ? {amount: out.draft.amount} : {}), ...(out.draft.date ? {date: out.draft.date} : {}), ...(out.draft.payee ? {payee: out.draft.payee} : {}), ...(out.draft.currency ? {currency: out.draft.currency} : {})});
      setState({kind: 'done', notes: out.notes});
    } catch (e) {
      if (controller.signal.aborted || isAbortLike(e)) { setState({kind: 'idle'}); return; }
      setState({kind: 'problem', lines: [e instanceof AiError || e instanceof Error ? e.message : 'The photo could not be read. Try again, or type the entry.']});
    } finally { if (abort.current === controller) abort.current = null; }
  }
  const pick = (input: HTMLInputElement | null) => { const file = input?.files?.[0]; if (input) input.value = ''; if (file) setState({kind: 'confirm', file}); }; // Z1B-10: seen and confirmed before it is sent

  if (!connected) return <div className="money-photos-draft" role="group" aria-labelledby={`${id}-title`}>
    <p className="money-photos-title" id={`${id}-title`}>Draft an entry from a receipt</p>
    <p>No AI is connected, so ZIGoals can&rsquo;t read a receipt. Type the entry yourself, or connect your own AI in Settings → ZIGi.</p>
    <div className="actions"><Link className="secondary" href="/app/settings">Open Settings</Link></div>
  </div>;
  if (!wealthShared) return <div className="money-photos-draft" role="group" aria-labelledby={`${id}-title`}>
    <p className="money-photos-title" id={`${id}-title`}>Draft an entry from a receipt</p>
    <p>Reading a receipt sends it to your AI, so it needs Wealth shared with ZIGi (Settings → ZIGi · Your Personal AI Companion → Share this page&rsquo;s data: Wealth).</p>
  </div>;
  const busy = state.kind === 'busy';
  return <div className="money-photos-draft" role="group" aria-labelledby={`${id}-title`} aria-busy={busy || undefined}>
    <p className="money-photos-title" id={`${id}-title`}>Draft an entry from a receipt</p>
    <p className="fine">The photo goes only to your own AI, which copies the total, the date and the shop into the Spending form for you to check. ZIGoals does not keep this photo; add it to the entry afterwards if you want it kept.</p>
    <input ref={take} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} aria-hidden="true" onChange={e => pick(e.currentTarget)}/>
    <input ref={choose} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => pick(e.currentTarget)}/>
    <div className="actions">
      <button type="button" className="secondary" disabled={busy} onClick={() => take.current?.click()}>Take a photo</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => choose.current?.click()}>Choose a photo</button>
      {busy && <button type="button" className="quiet" onClick={() => { abort.current?.abort(); setState({kind: 'idle'}); }}>Stop</button>}
    </div>
    <div aria-live="polite">
      {state.kind === 'busy' && <p className="fine">{state.line}</p>}
      {state.kind === 'done' && <div><p><strong>Read from the photo</strong>. The draft is in the Spending form above; every field stays yours to change, and nothing is saved until you tap Save.</p>{state.notes.length > 0 && <ul className="fine">{state.notes.map(n => <li key={n}>{n}</li>)}</ul>}</div>}
      {state.kind === 'problem' && <div role="alert"><p><strong>The receipt was not used.</strong></p><ul>{state.lines.map(l => <li key={l}>{l}</li>)}</ul></div>}
    </div>
    {state.kind === 'confirm' && settings && <PhotoSendConfirm file={state.file} what="receipt" target={{provider: settings.provider, model: settings.model, localServer: settings.localServer}} onSend={() => void read(state.file)} onCancel={() => setState({kind: 'idle'})}/>}
    {state.kind === 'spend' && <div><p>{state.note}</p><div className="actions"><button type="button" className="secondary" onClick={() => void read(state.file, true)}>Send anyway</button><button type="button" className="quiet" onClick={() => setState({kind: 'idle'})}>Not now</button></div></div>}
  </div>;
}
