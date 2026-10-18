'use client';
import type {WireValidator} from '../../lib/chain/validators-wire';
import {shortAddress} from '../../lib/staking/address';
import {concentrationOf, groupDigits, percentText} from '../../lib/staking/view';
import {formatDateTime} from '../../lib/visual-format';

/**
 * Session AF (L2 design §4): choose a validator by facts only — its name, commission, share of all staked ZIG, missed
 * blocks in the chain's window, when its commission last changed. Sorted by name (as the route answers), never by return.
 * Inactive and jailed validators earn nothing, so they are counted, not offered. The concentration line is a fact.
 */
export function ValidatorPicker({validators, value, onChange, exclude, legend, name}: {validators: readonly WireValidator[]; value: string; onChange: (operator: string) => void; exclude?: string; legend: string; name: string}) {
  const active = validators.filter(v => v.status === 'bonded' && !v.jailed && v.operator !== exclude);
  const inactive = validators.filter(v => v.status !== 'bonded' || v.jailed).length;
  const concentration = concentrationOf(validators);
  return <fieldset className="staking-validators">
    <legend>{legend}</legend>
    {concentration && <p className="fine staking-concentration">The {concentration.count} largest validators hold {percentText(concentration.share)} of all staked ZIG. Spreading stake keeps the network harder to control.</p>}
    <div className="staking-validator-list">
      {active.map(v => <label key={v.operator} className="staking-validator" title={v.operator}>
        <input type="radio" name={name} value={v.operator} checked={value === v.operator} onChange={() => onChange(v.operator)}/>
        <span className="staking-validator-text">
          <strong>{v.moniker || shortAddress(v.operator)}</strong>
          <span>Commission {percentText(v.commission.rate)} · {percentText(v.votingPowerShare)} of staked ZIG</span>
          <span>{v.uptime ? `Missed ${groupDigits(v.uptime.missed)} of the last ${groupDigits(v.uptime.window)} blocks` : 'Uptime unavailable'} · commission changed <time dateTime={v.commission.updatedAt}>{formatDateTime(v.commission.updatedAt)}</time></span>
          <span className="staking-validator-address">{shortAddress(v.operator)}</span>
        </span>
      </label>)}
    </div>
    {!active.length && <p className="notice">No active validator to choose on this network right now.</p>}
    {inactive > 0 && <p className="fine">{inactive} inactive or jailed validator{inactive === 1 ? ' is' : 's are'} not shown: they earn nothing while inactive.</p>}
  </fieldset>;
}
