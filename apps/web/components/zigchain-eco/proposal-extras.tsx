'use client';
import {useId, useMemo} from 'react';
import type {ProposalWire} from '../../lib/governance/wire';
import {GOV_REMINDERS, reminderOn, shortSummary, withReminder, withoutReminder} from '../../lib/zigchain-eco/governance';
import {useDeviceRecord} from '../ai/use-device-record';
import './zigchain-eco.css';

/**
 * Session AK (F4, governance, still hidden by default): on a proposal card, the proposer's own words made shorter and
 * plainer (always labelled as theirs), and an opt-in reminder a day before voting ends, kept on this device only
 * (zigoals:gov-reminders:v1). The reminder is a record the notification plan and the agenda read; it never votes.
 */
export function ProposalExtras({proposal, chainId, now}: {proposal: ProposalWire; chainId: string; now: number}) {
  const id = useId();
  const record = useDeviceRecord(GOV_REMINDERS);
  const short = useMemo(() => shortSummary(proposal.summary, proposal.title), [proposal.summary, proposal.title]);
  const open = proposal.state === 'voting' && !!proposal.votingEndTime && Date.parse(proposal.votingEndTime) > now;
  const on = record.loaded && !record.unreadable && reminderOn(record.data, chainId, proposal.id);
  const toggle = (checked: boolean) => { try { record.update(r => checked ? withReminder(r, chainId, proposal, Date.now()) : withoutReminder(r, chainId, proposal.id)); } catch { /* nothing changed */ } };
  if (!short && !open) return null;
  return <div className="zeco">
    {short && <section aria-labelledby={`${id}-short`}>
      <h4 id={`${id}-short`}>In short, in the proposer’s words</h4>
      <p>{short}</p>
      <p className="fine">Shortened by ZIGoals from what the proposer wrote; not checked. What it would change is said above from the proposal itself.</p>
    </section>}
    {open && record.loaded && !record.unreadable && <label className="zeco-toggle">
      <input type="checkbox" checked={on} onChange={e => toggle(e.target.checked)}/>
      <span>Remind me a day before voting ends (on this device)</span>
    </label>}
  </div>;
}
export default ProposalExtras;
