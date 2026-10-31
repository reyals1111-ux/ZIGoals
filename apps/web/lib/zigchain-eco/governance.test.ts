import {describe, expect, it} from 'vitest';
import {GOV_REMINDERS, GOV_REMINDERS_KEY, MAX_GOV_REMINDERS, MAX_SUMMARY, REMIND_BEFORE_MS, govRemindersSchema, governanceEvents, reminderOn, shortSummary, withReminder, withoutReminder} from './governance';
import {DIRECTORY_STATUS, NOT_LIVE_YET, STATUS_LABELS, directoryStatusOf} from './directory-status';
import {FAUCET_URL, practiceProgress, practiceSteps} from './practice';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {verifiedLink} from '@zigoals/ecosystem-registry/verified-links';

const NOW = Date.parse('2026-10-31T21:00:00Z');
// Proposal #45 on zigchain-1 as the LCD answered on 31 Oct 2026 (v5.1.2); the same gov v1 shape on v6.0.0.
const P45 = {id: '45', state: 'voting' as const, title: 'Software Upgrade to v6', votingEndTime: '2026-11-02T10:48:30.359Z',
  summary: 'Upgrade to v6 at height 13466800 (~Tue 2026-11-03 09:30 UTC): EVM enabled alongside CosmWasm, with Ethereum JSON-RPC and EIP-1559 fees.'};

describe('shortSummary: the proposer’s words, plainer', () => {
  it('keeps a short summary as it is', () => {
    expect(shortSummary(P45.summary, P45.title)).toBe(P45.summary);
  });
  it('removes Markdown, HTML, links, addresses and control characters', () => {
    const text = '## Why\n\n**Raise** the [community tax](https://evil.example/x) to 3%.<script>alert(1)</script> Send to zig1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq now.‮ See https://forum.example/t/1 ```code```';
    expect(shortSummary(text)).toBe('Why Raise the community tax to 3%. alert(1) Send to (an address) now. See (link removed)');
  });
  it('cuts long text at whole sentences, at most 280 characters', () => {
    const long = Array.from({length: 12}, (_, i) => `Sentence number ${i + 1} explains one more part of the change.`).join(' ');
    const out = shortSummary(long);
    expect(out.length).toBeLessThanOrEqual(MAX_SUMMARY + 2);
    expect(out).toMatch(/change\. …$/);
    const word = 'x'.repeat(400);
    expect(shortSummary(word).length).toBeLessThanOrEqual(MAX_SUMMARY);
  });
  it('says nothing when the summary only repeats the title', () => {
    expect(shortSummary('Software upgrade to v6.', 'Software Upgrade to v6')).toBe('');
    expect(shortSummary('', 'x')).toBe('');
  });
});

describe('opt-in proposal reminders', () => {
  it('is a new loose versioned device key with everything optional', () => {
    expect(GOV_REMINDERS_KEY).toBe('zigoals:gov-reminders:v1');
    expect(GOV_REMINDERS.empty()).toEqual({version: 1});
    expect(govRemindersSchema.parse({version: 1, future: true, reminders: {'zigchain-1:45': {endsAt: P45.votingEndTime, extra: 1}}})).toMatchObject({future: true});
    expect(govRemindersSchema.safeParse({version: 2}).success).toBe(false);
  });
  it('turns a reminder on and off for a proposal being voted on', () => {
    const on = withReminder({version: 1}, 'zigchain-1', P45, NOW);
    expect(reminderOn(on, 'zigchain-1', '45')).toBe(true);
    expect(reminderOn(on, 'zig-test-2', '45')).toBe(false);
    expect(on.reminders!['zigchain-1:45']).toEqual({endsAt: '2026-11-02T10:48:30.359Z', title: 'Software Upgrade to v6', setAt: '2026-10-31T21:00:00.000Z'});
    expect(reminderOn(withoutReminder(on, 'zigchain-1', '45'), 'zigchain-1', '45')).toBe(false);
    expect(withoutReminder({version: 1}, 'zigchain-1', '45')).toEqual({version: 1});
  });
  it('refuses a reminder for an ended, deposit-period or unknown proposal', () => {
    expect(() => withReminder({version: 1}, 'zigchain-1', {...P45, state: 'passed'}, NOW)).toThrow();
    expect(() => withReminder({version: 1}, 'zigchain-1', {...P45, votingEndTime: '2026-10-30T00:00:00Z'}, NOW)).toThrow();
    expect(() => withReminder({version: 1}, 'zigchain-1', {...P45, votingEndTime: null}, NOW)).toThrow();
    expect(() => withReminder({version: 1}, 'cosmoshub-4', P45, NOW)).toThrow();
  });
  it('drops ended reminders and keeps at most 50', () => {
    let record = withReminder({version: 1}, 'zigchain-1', P45, NOW);
    record = {...record, reminders: {...record.reminders, 'zigchain-1:1': {endsAt: '2026-10-01T00:00:00Z'}}};
    for (let i = 100; i < 160; i++) record = withReminder(record, 'zig-test-2', {...P45, id: String(i)}, NOW);
    expect(Object.keys(record.reminders!)).toHaveLength(MAX_GOV_REMINDERS);
    expect(record.reminders!['zigchain-1:1']).toBeUndefined();
    expect(record.reminders!['zig-test-2:159']).toBeDefined();
  });
  it('gives dated events 24 hours before the end (or now), without the proposer’s title', () => {
    const record = {version: 1 as const, reminders: {
      'zigchain-1:45': {endsAt: P45.votingEndTime}, 'zig-test-2:130': {endsAt: '2026-10-31T23:00:00Z'},
      'zigchain-1:2': {endsAt: '2026-10-01T00:00:00Z'}, 'bad key': {endsAt: P45.votingEndTime}, 'zigchain-1:3': {},
    }};
    const events = governanceEvents(record, {now: NOW, timeZone: 'UTC'});
    expect(events.map(e => [e.id, e.at, e.date, e.practice])).toEqual([
      ['governance:zig-test-2:130', '2026-10-31T21:00:00.000Z', '2026-10-31', true],
      ['governance:zigchain-1:45', new Date(Date.parse(P45.votingEndTime) - REMIND_BEFORE_MS).toISOString(), '2026-11-01', false],
    ]);
    expect(events[1]!.title).toBe('Voting on proposal #45 ends soon');
    expect(governanceEvents({version: 1}, {now: NOW})).toEqual([]);
  });
});

describe('ecosystem directory status', () => {
  it('covers every directory entry with a dated, sourced status and no invented one', () => {
    for (const entry of directoryEntries) {
      const status = directoryStatusOf(entry.id);
      expect(status, entry.id).not.toBeNull();
      expect(status!.readOn).toMatch(/^2026-10-(18|31)$/);
      expect(status!.label).toBe(STATUS_LABELS[status!.kind]);
      expect(status!.source.length).toBeGreaterThan(3);
    }
    expect(directoryStatusOf('not-a-project')).toBeNull();
    expect(directoryStatusOf('__proto__')).toBeNull();
  });
  it('keeps the Zignaly closure and says what is not live yet', () => {
    expect(DIRECTORY_STATUS.zignaly).toMatchObject({kind: 'closing'});
    expect(DIRECTORY_STATUS.zignaly!.detail).toContain('1 December 2026');
    expect(DIRECTORY_STATUS.nawa!.detail).toContain('Zignaly');
    expect(DIRECTORY_STATUS.wme!.kind).toBe('not-live');
    expect(NOT_LIVE_YET.map(n => n.what)).toContain('EVM apps and Ethereum-style addresses on the main network');
  });
});

describe('practice journey', () => {
  const c = (action: string, chainId = 'zig-test-2', state = 'CONFIRMED') => ({action, chainId, state}) as never;
  it('starts with nothing done and the faucet next', () => {
    const steps = practiceSteps({journal: [], practiceWallet: false, badgesOn: false});
    expect(practiceProgress(steps)).toMatchObject({done: 0, total: 5, complete: false, next: {id: 'faucet'}});
    expect(steps.find(s => s.id === 'badge')!.how).toMatch(/turn on practice badges in Settings/);
  });
  it('ticks steps from confirmed practice-network entries only', () => {
    const steps = practiceSteps({journal: [c('delegate'), c('claim', 'zigchain-1'), c('undelegate', 'zig-test-2', 'FAILED')], practiceWallet: true, badgesOn: true});
    expect(steps.filter(s => s.done).map(s => s.id)).toEqual(['faucet', 'connect', 'delegate']);
    expect(practiceProgress(steps).next?.id).toBe('claim');
  });
  it('is complete without the optional badge, and shows the badge once confirmed', () => {
    const steps = practiceSteps({journal: [c('delegate'), c('sweep'), c('undelegate')], practiceWallet: true, badgesOn: true});
    expect(practiceProgress(steps)).toMatchObject({done: 5, complete: true, next: {id: 'badge'}});
    expect(practiceSteps({journal: [c('attest')], practiceWallet: true, badgesOn: true}).find(s => s.id === 'badge')!.done).toBe(true);
  });
  it('links the faucet the verified link registry holds', () => {
    expect(verifiedLink('zig-finance', 'faucet').url).toBe(FAUCET_URL);
  });
});
