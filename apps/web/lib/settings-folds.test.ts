import {describe, expect, test} from 'vitest';
import {SETTINGS_FOLDS_KEY, SETTINGS_GROUP_IDS, allFolded, foldSummary, foldsForJump, groupForHash, groupForTarget, listPhrase, loadFolds, parseFolds, saveFolds} from './settings-folds';

// Session AL (D-088): Settings' groups fold from their headings; a jump opens the group that holds its target.
// A small stand-in for the page: which group each section id sits in.
const PAGE: Record<string, string> = {'send-feedback': 'settings-help', 'your-ai': 'settings-zigi', 'backup-restore': 'settings-data', 'wallet-network': 'settings-account', 'settings-zigi-title': 'settings-zigi', 'outside': 'not-a-group'};
const groupOf = (id: string) => PAGE[id] ?? null;

describe('hash → group', () => {
  test('a group id names its own group', () => {
    for (const id of SETTINGS_GROUP_IDS) expect(groupForHash(`#${id}`, () => null)).toBe(id);
  });
  test('a section id names the group around it', () => {
    expect(groupForHash('#send-feedback', groupOf)).toBe('settings-help');
    expect(groupForHash('#your-ai', groupOf)).toBe('settings-zigi');
    expect(groupForHash('#backup-restore', groupOf)).toBe('settings-data');
    expect(groupForHash('#settings-zigi-title', groupOf)).toBe('settings-zigi');
  });
  test('a percent-encoded fragment is decoded first', () => {
    expect(groupForHash('#send%2Dfeedback', groupOf)).toBe('settings-help');
  });
  test('no fragment, an unknown id, an element outside the groups or a malformed fragment names nothing', () => {
    for (const hash of ['', '#', '#nowhere', '#outside', '#%']) expect(groupForHash(hash, groupOf), hash).toBeNull();
    expect(groupForTarget(null, groupOf)).toBeNull();
    expect(groupForTarget('', groupOf)).toBeNull();
  });
  test('a page that opens on a jump keeps the other stored folds and opens the target\'s group', () => {
    expect(foldsForJump(['settings-data', 'settings-help'], 'settings-help')).toEqual(['settings-data']);
    expect(foldsForJump(['settings-data', 'settings-help'], null)).toEqual(['settings-data', 'settings-help']);
    expect(foldsForJump([], 'settings-zigi')).toEqual([]);
  });
});

describe('stored folds (this tab only)', () => {
  const store = () => { const m = new Map<string, string>(); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }}; };
  test('round trip, in page order, once each, known ids only', () => {
    const s = store();
    saveFolds(s, ['settings-help', 'settings-data', 'settings-help', 'made-up']);
    expect(s.m.get(SETTINGS_FOLDS_KEY)).toBe('["settings-data","settings-help"]');
    expect(loadFolds(s)).toEqual(['settings-data', 'settings-help']);
  });
  test('nothing folded removes the key', () => {
    const s = store();
    saveFolds(s, ['settings-app']);
    saveFolds(s, []);
    expect(s.m.has(SETTINGS_FOLDS_KEY)).toBe(false);
  });
  test('unreadable or blocked storage reads as every group open and never throws', () => {
    for (const raw of [null, '', 'not json', '{"a":1}', '42', '[1,null,"x"]']) expect(parseFolds(raw), String(raw)).toEqual([]);
    const blocked = {getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); }};
    expect(loadFolds(blocked)).toEqual([]);
    expect(() => saveFolds(blocked, ['settings-app'])).not.toThrow();
    expect(loadFolds(null)).toEqual([]);
  });
  test('allFolded only when all six are', () => {
    expect(allFolded(SETTINGS_GROUP_IDS)).toBe(true);
    expect(allFolded(SETTINGS_GROUP_IDS.slice(1))).toBe(false);
    expect(allFolded(new Set())).toBe(false);
  });
});

describe('the one-line summary a folded heading shows', () => {
  test('lists join as a sentence', () => {
    expect(listPhrase([])).toBe('');
    expect(listPhrase(['a'])).toBe('a');
    expect(listPhrase(['a', 'b'])).toBe('a and b');
    expect(listPhrase(['a', 'b', 'c'])).toBe('a, b and c');
  });
  test('each group names what it holds', () => {
    expect(foldSummary('settings-data')).toBe('Your data, backups, export everything, import from other apps and erase everything');
    expect(foldSummary('settings-app')).toBe('Plan, pages & buttons, Checklist, time zone, wrap-up, theme & motion, music and links');
    expect(foldSummary('settings-areas')).toBe('Habits, Health targets, chess, Guide, install, notifications, reminders and market data');
    expect(foldSummary('settings-account')).toBe('Account & sync and the PIN screen cover');
    expect(foldSummary('settings-zigi')).toBe('ZIGi’s settings and NOVA’s command center');
    expect(foldSummary('settings-help')).toBe('Storage health, diagnostics, send feedback, Point & tell and about this alpha');
  });
  test('the chain\'s parts show only once the chain is chosen, as their sections do', () => {
    expect(foldSummary('settings-account', {chain: true})).toBe('Account & sync, the PIN screen cover and wallet & network');
    expect(foldSummary('settings-app', {chain: true})).toContain('Checklist, Earn and Staking choices, time zone');
    expect(foldSummary('settings-app')).not.toMatch(/Earn|Staking/);
    expect(foldSummary('settings-account')).not.toContain('wallet');
  });
  test('every summary is one short line, no crypto words without the chain', () => {
    for (const id of SETTINGS_GROUP_IDS) {
      expect(foldSummary(id).length, id).toBeLessThanOrEqual(100);
      expect(foldSummary(id), id).not.toMatch(/wallet|chain|token|crypto/i);
    }
  });
});
