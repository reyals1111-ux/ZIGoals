'use client';
import {useCallback, useEffect, useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {ValidatorsWire} from '../../lib/chain/validators-wire';
import {VALIDATOR_ALERTS, alertsOff, healthOf, withAcknowledged, withBaselines, type ValidatorHealth} from '../../lib/validators/health';
import {groupDigits, percentText} from '../../lib/staking/view';
import {shortAddress} from '../../lib/staking/address';
import {formatDateTime} from '../../lib/visual-format';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 P6.7, rank 3): the health of the validators the person delegates to, in the app
 * only. `useValidatorHealth` is exported for the lead to show on Earn later: give it the network, the operators the person
 * delegates to and the validators route's answer; it keeps a baseline per validator on this device (only while alerts are
 * on), so a commission change since the last look is said, and "Got it" clears it. Jailed, tombstoned, inactive and
 * missing-blocks are read fresh each time and need no baseline. No notification leaves the app; nothing is sent anywhere.
 */
export function useValidatorHealth(chainId: string, operators: readonly string[], validators: ValidatorsWire | null) {
  const record = useDeviceRecord(VALIDATOR_ALERTS);
  const off = alertsOff(record.data);
  const list = useMemo(() => validators?.status === 'ok' ? validators.validators : [], [validators]);
  const key = operators.join(',');
  const health: ValidatorHealth[] = useMemo(() => validators?.status === 'ok' && !off ? healthOf(chainId, list, operators, record.data) : [], [chainId, list, key, record.data, off, validators?.status]); // eslint-disable-line react-hooks/exhaustive-deps -- operators by value
  useEffect(() => {
    if (!record.loaded || record.unreadable || off || validators?.status !== 'ok' || !operators.length) return;
    const next = withBaselines(record.data, chainId, list, operators);
    if (next !== record.data) try { record.update(() => next); } catch { /* the alerts still show; the baseline waits */ }
  }, [record.loaded, record.unreadable, record.data, off, chainId, list, key]); // eslint-disable-line react-hooks/exhaustive-deps -- operators by value
  const acknowledge = useCallback((operator: string) => {
    const validator = list.find(v => v.operator === operator);
    if (validator) try { record.update(r => withAcknowledged(r, chainId, validator)); } catch { /* nothing changed */ }
  }, [list, chainId, record]);
  return {loaded: record.loaded, off, health, acknowledge, source: validators?.status === 'ok' ? {height: validators.height!, observedAt: validators.observedAt!, source: validators.source} : null};
}
export function ValidatorHealthPanel({chainId, operators, validators}: {chainId: string; operators: readonly string[]; validators: ValidatorsWire | null}) {
  const {loaded, off, health, acknowledge, source} = useValidatorHealth(chainId, operators, validators);
  if (!operators.length) return null;
  return <section className="staking-health" aria-labelledby="staking-health-title">
    <h3 id="staking-health-title">Your validators&rsquo; health</h3>
    {!loaded ? <p className="fine">Reading…</p>
      : off ? <p className="fine">Validator alerts are off on this device. Turn them on again in Settings.</p>
      : !source ? <p className="fine">{validators?.status === 'unavailable' ? validators.reason : 'Reading the validators…'}</p>
      : <>
        <ul className="staking-health-list">{health.map(h => <li key={h.operator} className={`staking-health-item${h.alerts.some(a => a.severity === 'high') ? ' is-high' : h.alerts.some(a => a.severity === 'medium') ? ' is-medium' : ''}`} title={h.operator}>
          <p className="staking-health-name"><strong>{h.found ? h.name : shortAddress(h.operator)}</strong> <span className="pill">{h.alerts.length ? h.alerts.some(a => a.severity !== 'info') ? 'Needs a look' : 'Note' : 'Healthy'}</span></p>
          {h.alerts.length ? <ul className="staking-health-alerts">{h.alerts.map(a => <li key={a.kind}>{a.text}{(a.kind === 'commission-changed' || a.kind === 'commission-recent') && <> <button type="button" className="text-link" onClick={() => acknowledge(h.operator)}>Got it</button></>}</li>)}</ul> : null}
          {h.found && <p className="fine">Commission {h.commission ? percentText(h.commission.rate) : 'unavailable'}{h.missed ? ` · missed ${groupDigits(h.missed.count)} of the last ${groupDigits(h.missed.window)} blocks (the chain jails above ${groupDigits(h.missed.allowed)})` : ' · uptime unavailable'}</p>}
        </li>)}</ul>
        <p className="fine">Read from {source.source} at block {source.height}, {formatDateTime(source.observedAt)}. Shown here only: ZIGoals sends no notifications.</p>
      </>}
  </section>;
}
