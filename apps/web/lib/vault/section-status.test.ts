import {describe, expect, test} from 'vitest';
import {modules} from './account-data';
import {DOMAINS} from './cloud-sync';
import {HEALTH_STAYS_LOCAL, SECTION_KEYS, SECTION_TEXT, SECTION_TIMES_NOTE, pendingBySection, sectionRows, type SectionInput} from './section-status';

// Session AD item 11 (ADR-026): Settings → Sync, one plain line per section, from what the device already knows.
const base: SectionInput = {online: true, busy: false, error: '', health: false, held: [], synced: {}, pending: {}, extras: null, extrasOn: true, portfolio: null, portfolioAt: '', portfolioOn: false};
const rows = (input: Partial<SectionInput>) => Object.fromEntries(sectionRows({...base, ...input}).map(r => [r.id, r]));
const texts = (input: Partial<SectionInput>) => Object.fromEntries(sectionRows({...base, ...input}).map(r => [r.label, r.text]));

describe('which sections are listed', () => {
  test('Health is listed only while Health sync is on; the others always, in a fixed order with plain names', () => {
    expect(sectionRows(base).map(r => r.label)).toEqual(['Goals & Wealth', 'Habits', 'Today', 'The extras', 'Portfolio']);
    expect(sectionRows({...base, health: true}).map(r => r.label)).toEqual(['Goals & Wealth', 'Habits', 'Health', 'Today', 'The extras', 'Portfolio']);
    expect(HEALTH_STAYS_LOCAL).toBe('Health stays on this device until you turn on Health sync.');
    expect(SECTION_TIMES_NOTE).toBe('Times are from this session on this device.');
  });
  test('the section keys are the four synced records\' own keys (read without loading their schemas)', () => {
    for (const d of DOMAINS) expect(SECTION_KEYS[d], d).toBe(modules[d].key);
  });
});

describe('the four account sections', () => {
  test('before the first sync of this session: not synced yet; after it: up to date with the time', () => {
    expect(texts({})).toMatchObject({'Goals & Wealth': 'Not synced yet in this session', Habits: 'Not synced yet in this session', Today: 'Not synced yet in this session'});
    const r = rows({synced: {finance: {at: '10:42', merged: false}, habits: {at: '10:42', merged: false}, settings: {at: '10:42', merged: false}}});
    expect(r.finance).toMatchObject({text: 'Up to date · 10:42', tone: 'ok', retry: null, notice: null});
    expect(r.settings!.text).toBe('Up to date · 10:42');
  });
  test('a sync that brought another device\'s changes in says so beside the time', () => {
    const r = rows({synced: {habits: {at: '10:42', merged: true}, finance: {at: '10:42', merged: false}}});
    expect(r.habits).toMatchObject({text: 'Up to date · 10:42', notice: 'Updated with changes from your other device.'});
    expect(r.finance!.notice).toBeNull();
  });
  test('changes still in the local outbox are counted per section, one or many', () => {
    const r = rows({synced: {habits: {at: '10:42', merged: false}}, pending: {habits: 1, finance: 2}});
    expect(r.habits).toMatchObject({text: '1 change waiting to sync', tone: 'waiting'});
    expect(r.finance!.text).toBe('2 changes waiting to sync');
    expect(r.settings!.text).toBe('Not synced yet in this session');
  });
  test('offline: every syncing section says it waits for the network, with what is waiting', () => {
    const r = rows({online: false, pending: {finance: 3}, synced: {habits: {at: '10:42', merged: false}}, extras: {state: 'synced', outcomes: [], at: '10:42'}, portfolioOn: true});
    expect(r.finance).toMatchObject({text: 'Offline — 3 changes will sync when you’re back online', tone: 'offline', retry: null});
    expect(r.habits!.text).toBe('Offline — will sync when you’re back online');
    expect(r.extras!.text).toBe('Offline — will sync when you’re back online');
    expect(r.portfolio!.text).toBe('Offline — will sync when you’re back online');
  });
  test('a sync running says so; a failed sync offers "Try again", which runs the account sync', () => {
    expect(rows({busy: true}).habits!.text).toBe('Syncing…');
    const r = rows({error: 'Cloud changed. Local records were preserved. Retry to reconcile.', synced: {habits: {at: '10:42', merged: false}}});
    expect(r.habits).toMatchObject({text: 'Couldn’t sync. Your changes are kept on this device.', tone: 'error', retry: 'account'});
    expect(r.finance!.retry).toBe('account');
  });
  test('a section kept on this device after its cloud copy was deleted says so, whatever else is going on', () => {
    for (const input of [{}, {online: false}, {error: 'x'}, {pending: {finance: 2}}] as Partial<SectionInput>[]) expect(rows({...input, held: ['finance']}).finance).toMatchObject({text: 'Kept on this device only, because its cloud copy was deleted', tone: 'off', retry: null});
  });
  test('Health, while its sync is on, follows the same rules as the others', () => {
    expect(rows({health: true, pending: {health: 4}}).health!.text).toBe('4 changes waiting to sync');
    expect(rows({health: true, held: ['health']}).health!.text).toBe(SECTION_TEXT.held);
  });
});

describe('the extras', () => {
  test('off, removed or deleted elsewhere: they stay on this device', () => {
    expect(rows({extrasOn: false}).extras!.text).toBe('Off — the extras stay on this device');
    expect(rows({extras: {state: 'off'}}).extras!.text).toBe('Off — the extras stay on this device');
    expect(rows({extras: {state: 'removed'}}).extras!.text).toBe('Off — the extras’ cloud copy was deleted');
    expect(rows({extras: {state: 'deleted-elsewhere'}}).extras!.text).toBe('Off — the extras’ cloud copy was deleted');
  });
  test('synced, updated from another device, waiting, or failed', () => {
    expect(rows({extras: {state: 'synced', at: '10:43', outcomes: [{section: 'goals', state: 'unchanged'}]}}).extras).toMatchObject({text: 'Up to date · 10:43', notice: null});
    expect(rows({extras: {state: 'synced', at: '10:43', outcomes: [{section: 'life', state: 'pulled'}]}}).extras!.notice).toBe('Updated with changes from your other device.');
    expect(rows({extras: {state: 'synced', at: '10:43', outcomes: [{section: 'habits', state: 'waiting', message: 'Habit extras sync after your other device catches up.'}]}}).extras).toMatchObject({text: 'Waiting to sync', notice: 'Habit extras sync after your other device catches up.'});
    expect(rows({extras: {state: 'error', message: 'x'}}).extras).toMatchObject({text: SECTION_TEXT.error, retry: 'account'});
    expect(rows({extras: {state: 'synced', at: '10:43', outcomes: [{section: 'goals', state: 'unreadable', message: 'x'}]}}).extras!.retry).toBe('account');
  });
  test('the Health extras\' own outcome counts only while Health sync is on', () => {
    const extras = {state: 'synced' as const, at: '10:43', outcomes: [{section: 'goals' as const, state: 'unchanged' as const}, {section: 'health' as const, state: 'error' as const, message: 'x'}]};
    expect(rows({extras}).extras!.text).toBe('Up to date · 10:43');
    expect(rows({extras, health: true}).extras!.text).toBe(SECTION_TEXT.error);
  });
});

describe('the Portfolio', () => {
  test('off unless chosen on this device; deleted copies say so', () => {
    expect(rows({}).portfolio).toMatchObject({text: 'Off — your Portfolio stays on this device', tone: 'off'});
    expect(rows({portfolioOn: true, portfolio: {state: 'removed'}}).portfolio!.text).toBe('Off — the Portfolio’s cloud copy was deleted');
    expect(rows({portfolio: {state: 'deleted'}}).portfolio!.text).toBe('Off — the Portfolio’s cloud copy was deleted');
  });
  test('synced, pulled, a conflict to choose, a stale copy, an error with its own "Try again"', () => {
    expect(rows({portfolioOn: true}).portfolio!.text).toBe('Not synced yet in this session');
    expect(rows({portfolioOn: true, portfolio: {state: 'pushed'}, portfolioAt: '10:44'}).portfolio).toMatchObject({text: 'Up to date · 10:44', notice: null});
    expect(rows({portfolioOn: true, portfolio: {state: 'pulled'}, portfolioAt: '10:44'}).portfolio!.notice).toBe('Updated with changes from your other device.');
    expect(rows({portfolioOn: true, portfolio: {state: 'conflict'}}).portfolio).toMatchObject({text: SECTION_TEXT.portfolioConflict, retry: null});
    expect(rows({portfolioOn: true, portfolio: {state: 'stale'}}).portfolio!.text).toBe('Waiting — open ZIGoals on a device that has your Portfolio');
    expect(rows({portfolioOn: true, portfolio: {state: 'error', message: 'x'}}).portfolio).toMatchObject({text: SECTION_TEXT.error, retry: 'portfolio'});
  });
});

test('the outbox is counted per section by its device key; other entries are not counted', () => {
  expect(pendingBySection([{domain: 'zigoals:habits:v1'}, {domain: 'zigoals:habits:v1'}, {domain: 'zigoals:platform:v1'}, {domain: 'zigoals:other:v1'}])).toEqual({habits: 2, finance: 1});
  expect(pendingBySection([])).toEqual({});
});
