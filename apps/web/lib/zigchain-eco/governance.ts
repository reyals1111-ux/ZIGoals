import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {ProposalWire} from '../governance/wire';
import {calendarDay} from '../visual-format';

/**
 * Session AK (F4, governance; still hidden by default): two read-only additions to the Governance page.
 * 1. `shortSummary()`: the proposer's own text (title and summary, kept as plain text by the route), made shorter and
 *    plainer — Markdown, HTML, links and addresses removed, the first sentences kept — and always labelled as the
 *    proposer's words. What a proposal changes stays said from its messages (lib/governance/plain-words.ts).
 * 2. An opt-in reminder per proposal, on this device only: `zigoals:gov-reminders:v1`. `governanceEvents()` gives the
 *    reminders as dated events the lead feeds to the notification plan and the agenda (24 hours before voting ends, or
 *    at once when less is left). Voting itself stays the existing gov v1beta1 MsgVote through the one review sheet.
 */
export const MAX_SUMMARY = 280;
const SENTENCE = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
/** The proposer's text, plainer and at most 280 characters (whole sentences when they fit). Empty when nothing is left. */
export function shortSummary(summary: string, title = ''): string {
  let text = summary
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]{0,200}>/g, ' ')
    .replace(/!\[[^\]]{0,200}\]\([^)]{0,500}\)/g, ' ')
    .replace(/\[([^\]]{0,200})\]\([^)]{0,500}\)/g, '$1')
    .replace(/\bhttps?:\/\/\S+/gi, '(link removed)')
    .replace(/\b(zig1|zigvaloper1)[02-9ac-hj-np-z]{20,70}\b/g, '(an address)')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/[*`]{1,3}|~~|(?<!\w)_{1,3}|_{1,3}(?!\w)/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  // A summary that only repeats the title says nothing more.
  if (title && text.toLowerCase().replace(/[^a-z0-9]/g, '') === title.toLowerCase().replace(/[^a-z0-9]/g, '')) return '';
  if (text.length <= MAX_SUMMARY) return text;
  let out = '';
  for (const sentence of text.match(SENTENCE) ?? []) {
    const next = (out + ' ' + sentence.trim()).trim();
    if (next.length > MAX_SUMMARY) break;
    out = next;
  }
  if (!out) { text = text.slice(0, MAX_SUMMARY - 1); out = `${text.slice(0, Math.max(text.lastIndexOf(' '), MAX_SUMMARY / 2)).trim()}…`; }
  else out += ' …';
  return out;
}

// ---- Opt-in reminders ----------------------------------------------------------------------------------------------
export const GOV_REMINDERS_KEY = 'zigoals:gov-reminders:v1';
export const MAX_GOV_REMINDERS = 50;
export const REMIND_BEFORE_MS = 24 * 3_600_000;
const reminderSchema = z.looseObject({endsAt: z.string().max(40).optional(), title: z.string().max(120).optional(), setAt: z.string().max(40).optional()});
export const govRemindersSchema = z.looseObject({
  version: z.literal(1),
  /** Keyed `<chain id>:<proposal number>`. */
  reminders: z.record(z.string().max(48), reminderSchema).optional(),
});
export type GovReminders = z.infer<typeof govRemindersSchema>;
export const GOV_REMINDERS: DeviceRecordSpec<GovReminders> = {key: GOV_REMINDERS_KEY, schema: govRemindersSchema, empty: () => ({version: 1})};
const KEY = /^(zigchain-1|zig-test-2):[1-9]\d{0,18}$/;
export const reminderKey = (chainId: string, proposalId: string) => `${chainId}:${proposalId}`;
export const reminderOn = (record: GovReminders, chainId: string, proposalId: string) => !!record.reminders?.[reminderKey(chainId, proposalId)];
/** Turns a reminder on for a proposal in its voting period; ended reminders are dropped first, then the oldest past 50. */
export function withReminder(record: GovReminders, chainId: string, proposal: Pick<ProposalWire, 'id' | 'title' | 'votingEndTime' | 'state'>, now: number): GovReminders {
  const key = reminderKey(chainId, proposal.id);
  if (!KEY.test(key) || proposal.state !== 'voting' || !proposal.votingEndTime || Number.isNaN(Date.parse(proposal.votingEndTime)) || Date.parse(proposal.votingEndTime) <= now) throw Error('A reminder can only be set for a proposal that is being voted on.');
  const kept = Object.entries(record.reminders ?? {}).filter(([k, r]) => k !== key && KEY.test(k) && typeof r.endsAt === 'string' && Date.parse(r.endsAt) > now);
  while (kept.length >= MAX_GOV_REMINDERS) kept.shift();
  return {...record, reminders: {...Object.fromEntries(kept), [key]: {endsAt: new Date(Date.parse(proposal.votingEndTime)).toISOString(), title: proposal.title.slice(0, 120), setAt: new Date(now).toISOString()}}};
}
export function withoutReminder(record: GovReminders, chainId: string, proposalId: string): GovReminders {
  const key = reminderKey(chainId, proposalId);
  if (!record.reminders?.[key]) return record;
  const next = {...record.reminders};
  delete next[key];
  return {...record, reminders: next};
}
export type GovernanceEvent = {id: string; kind: 'governance'; network: string; practice: boolean; proposalId: string; title: string; at: string; date: string; endsAt: string; href: string};
/** The reminders still ahead, soonest first: each at 24 hours before voting ends (or `now` when less is left). */
export function governanceEvents(record: GovReminders, {now, timeZone}: {now: number; timeZone?: string}): GovernanceEvent[] {
  const out: GovernanceEvent[] = [];
  for (const [key, r] of Object.entries(record.reminders ?? {})) {
    if (!KEY.test(key) || typeof r.endsAt !== 'string') continue;
    const ends = Date.parse(r.endsAt);
    if (Number.isNaN(ends) || ends <= now) continue;
    const [network = '', proposalId = ''] = key.split(':');
    const at = Math.max(now, ends - REMIND_BEFORE_MS);
    out.push({id: `governance:${key}`, kind: 'governance', network, practice: network === 'zig-test-2', proposalId, title: `Voting on proposal #${proposalId} ends soon`, at: new Date(at).toISOString(), date: calendarDay(at, timeZone), endsAt: new Date(ends).toISOString(), href: '/app/governance'});
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id)).slice(0, MAX_GOV_REMINDERS);
}
