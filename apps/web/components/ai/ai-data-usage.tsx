'use client';
import {useState} from 'react';
import {dataModeLine} from '../../lib/ai/capabilities';
import {readKey} from '../../lib/ai/keys';
import {listModels} from '../../lib/ai/models';
import {PROVIDERS, type ProviderId} from '../../lib/ai/providers';
import type {AiSettings} from '../../lib/ai/settings';
import {AI_OPTIONS, AI_USAGE, TOOL_MODES, type AiUsage, type ToolMode} from '../../lib/ai/store/records';
import type {ModelInfo} from '../../lib/ai/types';
import {capNote, capState, estimate, money, monthKey} from '../../lib/ai/usage';
import {ModelPicker} from './model-picker';
import {useDeviceRecord} from './use-device-record';

/**
 * Settings → ZIGi · your AI, Session V Part 6: how the person's AI gets their data (tools or attached records), the
 * model "Think deeper" uses, and the usage meter with the person's own prices and soft cap. All device-only
 * (`zigoals:ai-options:v1`, `zigoals:ai-usage:v1`), never synced, in Export; nothing here is sent anywhere.
 */
const MODE_LABELS: Record<ToolMode, string> = {auto: 'Automatic', tools: 'Tools', attach: 'Attach'};
const MODE_NOTES: Record<ToolMode, string> = {
  auto: 'Tools where your model takes them (OpenAI, Anthropic, Gemini and xAI document them; OpenRouter, Ollama and LM Studio say per model), otherwise the records chosen from your question are attached.',
  tools: `Always offer the tools. ${dataModeLine('tools', false)} A model that refuses them gets the records attached instead, for the rest of the session.`,
  attach: `${dataModeLine('attach', false)} Your AI cannot ask for more.`,
};
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'] as const;
const DECIMAL = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/;
const routeName = (route: string) => route in PROVIDERS ? PROVIDERS[route as ProviderId].name : route === 'hosted' ? 'ZIGoals hosted' : route === 'on-device' ? 'Chrome on-device' : route;
export function AiDataUsage({settings, scope}: {settings: AiSettings; scope: string}) {
  const options = useDeviceRecord(AI_OPTIONS), usage = useDeviceRecord(AI_USAGE), provider = settings.provider;
  const [models, setModels] = useState<ModelInfo[] | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const save = <T,>(store: {update: (change: (current: T) => T) => T}, change: (current: T) => T, text?: string) => { try { store.update(change); if (text) setMessage({text}); } catch (error) { setMessage({text: `Not saved on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true}); } };
  const mode = options.data.toolMode ?? 'auto', deep = provider ? options.data.deepModel?.[provider] ?? null : null;
  const loadModels = async () => {
    if (!provider) return; setBusy(true); setMessage(null);
    try { const key = await readKey(scope, provider); setModels((await listModels({provider, key, baseUrl: settings.baseUrl ?? undefined, localServer: settings.localServer ?? undefined})).filter(m => m.kind === 'chat')); }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'The model list could not be loaded.', failed: true}); }
    finally { setBusy(false); }
  };
  const month = monthKey(new Date()), routes = Object.entries(usage.data.months?.[month] ?? {}), result = estimate(usage.data, month), cap = capState(usage.data, month), note = capNote(cap);
  const price = provider ? usage.data.prices?.[provider] : undefined;
  const setPrice = (field: 'input' | 'output', value: string) => {
    if (!provider) return;
    const clean = value.trim();
    if (clean && !DECIMAL.test(clean)) { setMessage({text: 'A price is a plain number such as 2.5 (per million tokens).', failed: true}); return; }
    save<AiUsage>(usage, current => {
      const prices = {...(current.prices ?? {})}, was = prices[provider] ?? {currency: 'USD'}, next = {...was, [field]: clean || undefined};
      if (next.input === undefined && next.output === undefined) delete prices[provider]; else prices[provider] = next;
      return {...current, prices};
    });
  };
  return <>
    <h4>How your AI gets your data</h4>
    <label className="field">Data for each message<select value={mode} onChange={e => save(options, current => ({...current, toolMode: e.target.value as ToolMode}), `Data mode: ${MODE_LABELS[e.target.value as ToolMode]}.`)}>{TOOL_MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}</select><small>{MODE_NOTES[mode]} Either way only what your page switches and Include Health allow, and nothing on private screens. Your AI can only read: changes still come as cards you confirm.</small></label>
    {provider && settings.model && <div className="ai-photo-setting">
      <label className="ai-check"><input type="checkbox" checked={options.data.visionDeclared?.[`${provider}:${settings.model}`] === true} onChange={e => save(options, current => { const visionDeclared = {...(current.visionDeclared ?? {})}; if (e.target.checked) visionDeclared[`${provider}:${settings.model}`] = true; else delete visionDeclared[`${provider}:${settings.model}`]; return {...current, visionDeclared}; }, e.target.checked ? 'Meal photos are offered in the chat when Health is shared.' : 'Meal photos are not offered for this model.')}/> {settings.model} reads photos</label>
      <small className="ai-note">For meal photos in the chat: tick it if your provider&rsquo;s model page says this model takes images (OpenRouter, Ollama and LM Studio also say so themselves). A photo needs Health shared, goes only with that message to your AI, and is never kept by ZIGoals.</small>
    </div>}
    {provider && <div className="ai-deep-model">
      <p className="ai-note"><strong>Think deeper</strong> asks the same question again with a second model you choose and up to twice the records (32,000 characters). {deep ? `Chosen: ${deep}.` : 'No deep model is chosen, so the button does not show.'}</p>
      <div className="ai-card-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => models ? setModels(null) : void loadModels()}>{busy ? 'Loading models…' : models ? 'Hide models' : deep ? 'Change the deep model' : 'Choose a deep model'}</button>
        {deep && <button type="button" className="text-link" onClick={() => save(options, current => { const deepModel = {...(current.deepModel ?? {})}; delete deepModel[provider]; return {...current, deepModel}; }, 'No deep model: Think deeper is hidden.')}>Remove</button>}
      </div>
      {models && <ModelPicker label="Deep model" models={models} value={deep} onChange={id => { save(options, current => ({...current, deepModel: {...(current.deepModel ?? {}), [provider]: id}}), `Think deeper uses ${id}.`); setModels(null); }}/>}
    </div>}
    <h4>Usage on this device</h4>
    <p className="ai-note">Tokens as your provider reported them, counted on this device this month ({month}). Your provider&rsquo;s own usage page is the record that counts.</p>
    {routes.length === 0 ? <p className="ai-note">No replies from your AI this month yet.</p> : <table className="ai-usage-table">
      <thead><tr><th scope="col">Route</th><th scope="col">Requests</th><th scope="col">Tokens in</th><th scope="col">Tokens out</th></tr></thead>
      <tbody>{routes.map(([route, used]) => <tr key={route}><th scope="row">{routeName(route)}</th><td>{used.requests.toLocaleString('en-US')}{used.unreported ? ` (${used.unreported.toLocaleString('en-US')} without counts)` : ''}</td><td>{used.input.toLocaleString('en-US')}</td><td>{used.output.toLocaleString('en-US')}</td></tr>)}</tbody>
    </table>}
    {result.amounts.length > 0 && <p className="ai-note">Estimate from your prices: {result.amounts.map(a => money(a.amount, a.currency)).join(' and ')}{result.unpriced.length ? ` (without ${result.unpriced.map(routeName).join(', ')}: no price entered)` : ''}. Never converted between currencies; not a bill.</p>}
    {note && <p className="ai-note" role="status">{note}</p>}
    {provider && <fieldset className="ai-usage-prices"><legend>Your prices for {PROVIDERS[provider].name} (optional)</legend>
      <div className="ai-fields">
        <label className="field">Per million tokens in<input inputMode="decimal" defaultValue={price?.input ?? ''} key={`in-${provider}-${price?.input ?? ''}`} onBlur={e => setPrice('input', e.target.value)} placeholder="e.g. 2.5" autoComplete="off"/></label>
        <label className="field">Per million tokens out<input inputMode="decimal" defaultValue={price?.output ?? ''} key={`out-${provider}-${price?.output ?? ''}`} onBlur={e => setPrice('output', e.target.value)} placeholder="e.g. 10" autoComplete="off"/></label>
        <label className="field">Currency<select value={price?.currency ?? 'USD'} onChange={e => save<AiUsage>(usage, current => ({...current, prices: {...(current.prices ?? {}), [provider]: {...(current.prices?.[provider] ?? {}), currency: e.target.value}}}))}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <small>Copy them from your provider&rsquo;s pricing page; ZIGoals never looks prices up. They stay on this device.</small>
    </fieldset>}
    <fieldset className="ai-usage-cap"><legend>Monthly cap (optional)</legend>
      <div className="ai-fields">
        <label className="field">Amount<input inputMode="decimal" defaultValue={usage.data.softCap?.amount ?? ''} key={`cap-${usage.data.softCap?.amount ?? ''}`} placeholder="e.g. 10" autoComplete="off" onBlur={e => { const v = e.target.value.trim(); if (v && !DECIMAL.test(v)) { setMessage({text: 'The cap is a plain number such as 10.', failed: true}); return; } save<AiUsage>(usage, current => ({...current, softCap: v ? {amount: v, currency: current.softCap?.currency ?? price?.currency ?? 'USD'} : null}), v ? 'Monthly cap saved.' : 'No monthly cap.'); }}/></label>
        <label className="field">Currency<select value={usage.data.softCap?.currency ?? price?.currency ?? 'USD'} disabled={!usage.data.softCap} onChange={e => save<AiUsage>(usage, current => current.softCap ? {...current, softCap: {...current.softCap, currency: e.target.value}} : current)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <label className="ai-check"><input type="checkbox" checked={!!usage.data.askFirst} disabled={!usage.data.softCap} onChange={e => save<AiUsage>(usage, current => ({...current, askFirst: e.target.checked}))}/> Ask me before sending once the cap is reached</label>
      <small>ZIGi notes 80 % and 100 % of the cap, estimated from your prices in the cap&rsquo;s currency. It asks before sending only if you tick the box; it never stops you.</small>
    </fieldset>
    {routes.length > 0 && <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => save<AiUsage>(usage, current => ({...current, months: {}}), 'The counts on this device were cleared; your prices and cap are kept.')}>Clear the counts on this device</button></div>}
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
  </>;
}
