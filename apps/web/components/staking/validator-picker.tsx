'use client';
import {useId, useMemo, useState} from 'react';
import type {WireValidator} from '../../lib/chain/validators-wire';
import {shortAddress} from '../../lib/staking/address';
import {concentrationOf, percentText} from '../../lib/staking/view';
import {PICKER_CAPS, PICKER_SORTS, decentralisationHint, pickerOrder, powerRanks, spreadLine, uptimeWords, TOP_N, type PickerSort} from '../../lib/zigchain-eco/validators';
import {formatDateTime} from '../../lib/visual-format';
import {WhatsThis} from '../earn/whats-this';

/**
 * Session AF (L2 design §4): choose a validator by facts only — its name, commission, share of all staked ZIG, missed
 * blocks in the chain's window, when its commission last changed. Sorted by name (as the route answers), never by return.
 * Inactive and jailed validators earn nothing, so they are counted, not offered. The concentration line is a fact.
 *
 * Session AK (F4): read-only facts added — its rank by stake with a gentle hint for the 10 largest, how many validators
 * together hold more than a third (the Nakamoto count), and an order that puts validators outside the 10 largest first
 * (on by default, one tap to turn off). Jailed and removed validators are still never offered; nothing about what is
 * signed changes (the choice is the same operator address the review sheet shows).
 */
export function ValidatorPicker({validators, value, onChange, exclude, legend, name}: {validators: readonly WireValidator[]; value: string; onChange: (operator: string) => void; exclude?: string; legend: string; name: string}) {
  const orderId = useId(), sortId = useId(), capId = useId();
  const [outsideFirst, setOutsideFirst] = useState(true);
  // Session AL fourth pass (C-BN-01, C-DVG-67): the dialog sorts and caps commission as Earn's list does (facts only).
  const [sort, setSort] = useState<PickerSort>('suggested'), [cap, setCap] = useState<number | null>(null);
  const ranks = useMemo(() => powerRanks(validators), [validators]);
  const ordered = useMemo(() => pickerOrder(validators, sort === 'suggested' && !outsideFirst ? 'name' : sort, cap), [validators, outsideFirst, sort, cap]);
  // The chosen validator stays offered even when the cap would hide it, so a choice never vanishes under the person.
  const active = ordered.filter(v => v.status === 'bonded' && !v.jailed && v.operator !== exclude);
  const capped = cap !== null ? validators.filter(v => v.status === 'bonded' && !v.jailed && v.operator !== exclude && Number(v.commission.rate) > cap + 1e-12).length : 0;
  const inactive = validators.filter(v => v.status !== 'bonded' || v.jailed).length;
  const removed = validators.filter(v => v.tombstoned).length;
  const concentration = concentrationOf(validators);
  const spread = spreadLine(validators);
  return <fieldset className="staking-validators">
    <legend>{legend}</legend>
    {/* Session AF (L1c, N1): the words a choice of validator rests on, one tap away. */}
    <p className="whats-this-row"><WhatsThis term="validator"/> <WhatsThis term="commission"/> <WhatsThis term="voting-power"/></p>
    {concentration && <p className="fine staking-concentration">The {concentration.count} largest validators hold {percentText(concentration.share)} of all staked ZIG. Spreading stake keeps the network harder to control.</p>}
    {spread && <p className="fine staking-spread">{spread}</p>}
    <div className="staking-picker-controls">
      <label className="field" htmlFor={sortId}>Order<select id={sortId} value={sort} onChange={e => setSort(e.target.value as PickerSort)}>{PICKER_SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="field" htmlFor={capId}>Commission<select id={capId} value={cap === null ? '' : String(cap)} onChange={e => setCap(e.target.value === '' ? null : Number(e.target.value))}>{PICKER_CAPS.map(([v, label]) => <option key={label} value={v === null ? '' : String(v)}>{label}</option>)}</select></label>
    </div>
    {capped > 0 && <p className="fine">{capped} active validator{capped === 1 ? '' : 's'} above that commission {capped === 1 ? 'is' : 'are'} not shown.</p>}
    {sort === 'suggested' && ranks.size > TOP_N && <label className="staking-order-toggle" htmlFor={orderId}>
      <input id={orderId} type="checkbox" checked={outsideFirst} onChange={e => setOutsideFirst(e.target.checked)}/>
      <span>Show validators outside the {TOP_N} largest first</span>
    </label>}
    <div className="staking-validator-list">
      {active.map(v => { const rank = ranks.get(v.operator), hint = decentralisationHint(rank, ranks.size); return <label key={v.operator} className="staking-validator" title={v.operator}>
        <input type="radio" name={name} value={v.operator} checked={value === v.operator} onChange={() => onChange(v.operator)}/>
        <span className="staking-validator-text">
          <strong>{v.moniker || shortAddress(v.operator)}</strong>
          <span>Commission {percentText(v.commission.rate)} · {percentText(v.votingPowerShare)} of staked ZIG{rank ? ` · number ${rank} by stake` : ''}</span>
          <span>{v.uptime ? uptimeWords(v.uptime) : 'Uptime unavailable'} · commission changed <time dateTime={v.commission.updatedAt}>{formatDateTime(v.commission.updatedAt)}</time></span>
          {hint && <span className="staking-validator-hint">{hint}</span>}
          <span className="staking-validator-address">{shortAddress(v.operator)}</span>
        </span>
      </label>; })}
    </div>
    {!active.length && <p className="notice">No active validator to choose on this network right now.</p>}
    {inactive > 0 && <p className="fine">{inactive} inactive or jailed validator{inactive === 1 ? ' is' : 's are'} not shown: they earn nothing while inactive.{removed > 0 ? ` ${removed} of them ${removed === 1 ? 'was' : 'were'} removed for good for signing twice.` : ''} <WhatsThis term="jailed"/></p>}
  </fieldset>;
}
