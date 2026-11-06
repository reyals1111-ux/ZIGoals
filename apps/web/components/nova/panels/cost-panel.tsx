'use client';
import Link from 'next/link';
import {useState} from 'react';
import {publishedPriceFor} from '../../../lib/ai/pricing';
import {PROVIDERS, type ProviderId} from '../../../lib/ai/providers';
import {AI_USAGE, type AiUsage} from '../../../lib/ai/store/records';
import {capNote, costRows, dailyCapState, dayKey, money, monthKey, type CostRow} from '../../../lib/ai/usage';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useMoneyCurrency} from '../../wealth/use-money-currency';
import '../../ai/ai.css';
import './panels.css';

/**
 * NOVA's Cost meter (Session AK, owner follow-up 2 N2), on ZIGi's one usage record (`zigoals:ai-usage:v1`): tokens per
 * provider this month as each provider reported them, today's once a daily cap is set, and an estimate labelled with its
 * source — the person's own prices, else the dated published table (lib/ai/pricing.ts), else "price unknown", never zero.
 * A local model is free, on the device. The daily cap notes 80 % and 100 % or also asks before a cloud send (the chat's
 * own "ask first"); it never stops anyone. Never a bill.
 */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'] as const;
/** Where the prices and the monthly cap really are (PR-035: "Settings → ZIGi → Usage" named no heading on the page). */
const USAGE_PLACE = 'Settings → ZIGi → Advanced → Usage on this device', USAGE_HREF = '/app/settings#zigi-usage';
const DECIMAL = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/;
const routeName = (route: string) => route in PROVIDERS ? (route === 'local' ? 'Local model' : PROVIDERS[route as ProviderId].name) : route === 'on-device' ? 'Chrome on-device' : route === 'hosted' ? 'ZIGoals hosted' : route;
const count = (n: number) => n.toLocaleString('en-US');
function estimateText(row: CostRow): string {
  if (row.free) return 'Free, on your device';
  if (!row.estimate) return 'Price unknown — an estimate is not possible';
  return `about ${money(row.estimate.amount, row.estimate.currency)} (${row.estimate.basis === 'your-prices' ? 'from your prices' : `published prices as of ${row.estimate.asOf}`})`;
}
export default function CostPanel() {
  const usage = useDeviceRecord(AI_USAGE), settings = useAiSettings(), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  // Session AL third pass (P-DVR-22, P-PR-31; N-MO-03, PR-035): a new cap starts in the person's money currency, not USD,
  // and the currency can be chosen before the amount (it was disabled until a cap existed, so it "would not change").
  const moneyCurrency = useMoneyCurrency(), [draftCurrency, setDraftCurrency] = useState<string | null>(null);
  const now = new Date(), month = monthKey(now), day = dayKey(now), provider = settings.data.enabled ? settings.data.provider : null, model = settings.data.model;
  const rows = costRows(usage.data, month, day, provider && model ? {[provider]: model} : {});
  const cap = usage.data.dailyCap ?? null, state = dailyCapState(usage.data, day), note = capNote(state);
  const save = (change: (current: AiUsage) => AiUsage, text: string) => { try { usage.update(change); setMessage({text}); } catch (error) { setMessage({text: `Not saved on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true}); } };
  const published = provider && provider !== 'local' && model ? publishedPriceFor(provider, model, day) : null, ownPrice = provider ? usage.data.prices?.[provider] : undefined;
  const capCurrency = cap?.currency ?? draftCurrency ?? ownPrice?.currency ?? moneyCurrency;
  if (!usage.loaded) return <p className="ai-note" role="status">Reading your usage…</p>;
  return <div className="nova-cost">
    <p className="ai-note"><strong>An estimate, not a bill.</strong> Tokens as your provider reported them, counted on this device for {month}. Your provider&rsquo;s own usage page is the record that counts.</p>
    {rows.length === 0 ? <p className="ai-note">No replies from a model this month yet. A local model is free, on your device.</p>
      : <div className="ai-usage-scroll"><table className="ai-usage-table nova-cost-table">
        <caption className="sr-only">Usage and estimated cost per provider this month</caption>
        <thead><tr><th scope="col">Provider</th><th scope="col">Requests</th><th scope="col">Tokens in / out</th><th scope="col">Today</th><th scope="col">Estimate</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.route}>
          <th scope="row">{routeName(r.route)}</th>
          <td>{count(r.month.requests)}{r.month.unreported ? ` (${count(r.month.unreported)} without counts)` : ''}</td>
          <td>{count(r.month.input + (r.month.cacheWrite ?? 0) + (r.month.cacheRead ?? 0))} / {count(r.month.output)}</td>
          <td>{r.today ? `${count(r.today.input)} / ${count(r.today.output)}` : cap ? '0 / 0' : '—'}</td>
          <td>{estimateText(r)}</td>
        </tr>)}</tbody>
      </table></div>}
    {provider && provider !== 'local' && !ownPrice && <div className="ai-card-actions">
      {published ? <button type="button" className="secondary" onClick={() => save(c => ({...c, prices: {...(c.prices ?? {}), [provider]: {input: String(published.usd.input), output: String(published.usd.output), currency: 'USD'}}}), `${PROVIDERS[provider].name}: the published prices for ${model} are now your prices (USD per million tokens).`)}>Use the published prices for {model}</button>
        : <p className="ai-note">{model} is not in the published table: add your prices in <Link className="text-link" href={USAGE_HREF}>{USAGE_PLACE}</Link> for an estimate.</p>}
    </div>}
    <fieldset className="ai-usage-cap"><legend>Daily cap (optional)</legend>
      <div className="ai-fields">
        <label className="field">Amount<input inputMode="decimal" defaultValue={cap?.amount ?? ''} key={`dcap-${cap?.amount ?? ''}`} placeholder="e.g. 1" autoComplete="off" onBlur={e => {
          const v = e.target.value.trim();
          if (v && !DECIMAL.test(v)) { setMessage({text: 'The cap is a plain number such as 1.5.', failed: true}); return; }
          if (!v) { if (cap) save(c => { const next = {...c, dailyCap: null}; delete next.days; return next; }, 'No daily cap; per-day counting stopped and its counts were cleared.'); return; }
          save(c => ({...c, dailyCap: {amount: v, currency: c.dailyCap?.currency ?? capCurrency, mode: c.dailyCap?.mode ?? 'warn'}}), 'Daily cap saved: counting per day starts now.');
        }}/></label>
        <label className="field">Currency<select value={capCurrency} onChange={e => { const next = e.target.value; if (cap) save(c => c.dailyCap ? {...c, dailyCap: {...c.dailyCap, currency: next}} : c, `Daily cap in ${next}.`); else { setDraftCurrency(next); setMessage({text: `The cap will be in ${next} once you enter an amount.`}); } }}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <fieldset className="nova-radio-row" disabled={!cap}><legend className="sr-only">Past the daily cap</legend>
        <label className="ai-check"><input type="radio" name="nova-cap-mode" checked={(cap?.mode ?? 'warn') === 'warn'} onChange={() => save(c => c.dailyCap ? {...c, dailyCap: {...c.dailyCap, mode: 'warn'}} : c, 'Past the cap: a note only.')}/> Warn me</label>
        <label className="ai-check"><input type="radio" name="nova-cap-mode" checked={cap?.mode === 'ask'} onChange={() => save(c => c.dailyCap ? {...c, dailyCap: {...c.dailyCap, mode: 'ask'}} : c, 'Past the cap: NOVA and ZIGi ask before a cloud send.')}/> Ask before sending</label>
      </fieldset>
      <small>Cloud models only, estimated from your prices in the cap&rsquo;s currency. A note at 80 % and 100 %; with &ldquo;Ask before sending&rdquo;, the chat asks first and briefs and workflows keep NOVA&rsquo;s own words. It never stops you. The monthly cap is in <Link className="text-link" href={USAGE_HREF}>{USAGE_PLACE}</Link>, once your AI is connected there.</small>
    </fieldset>
    {note ? <p className="ai-note" role="status">{note}</p> : cap && state ? <p className="ai-note">Today so far: {money(state.amount, state.currency)} of {money(state.cap, state.currency)}, estimated.</p> : null}
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
  </div>;
}
