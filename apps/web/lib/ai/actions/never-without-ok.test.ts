import {describe, expect, test} from 'vitest';
import {AI_OPTIONS} from '../store/records';
import {ACTION_KINDS, WRITING_KINDS} from './schema';
import {AUTO_ACCEPT_NEVER, autoAcceptVerdict} from './auto-accept';
import {TOOLS} from '../tools/registry';

/**
 * Session AI (N3, picklist 1): ZIGi's claim "nothing is written until you add a card" holds. Every write is a card the
 * person adds, or — only for kinds they switched on themselves in Settings — an auto-add with Undo. Checked here:
 * - with the options a new device starts with, no kind is ever added without a tap;
 * - money, weight, fasting, deletions and page openings can never be auto-added, whatever the setting says;
 * - ZIGi's tools only read: none of them is a writing kind, and every tool's name is a read verb or a record name.
 */
describe('never anything without the person\'s OK', () => {
  const fresh = AI_OPTIONS.empty();
  test('a new device auto-adds nothing', () => {
    for (const kind of ACTION_KINDS) expect(autoAcceptVerdict(fresh, kind, '2026-10-28', true)).toEqual({ok: false, reason: expect.stringMatching(/^(off|never)$/)});
  });
  test('money, weight, fasting, deletions and navigation are never automatic, even when switched on', () => {
    const all = {...fresh, autoAccept: {kinds: Object.fromEntries(ACTION_KINDS.map(k => [k, true])), dailyCap: 100, days: {}}};
    for (const kind of AUTO_ACCEPT_NEVER) expect(autoAcceptVerdict(all, kind, '2026-10-28', true).ok).toBe(false);
    for (const kind of ['prefill-holding', 'prefill-contribution', 'prefill-account', 'update-account-balance', 'prefill-staking', 'delete-record', 'log-weight']) expect((AUTO_ACCEPT_NEVER as readonly string[]).includes(kind)).toBe(true);
  });
  test('the tools ZIGi\'s AI calls only read records', () => {
    const writing = new Set<string>(WRITING_KINDS);
    expect(TOOLS.filter(t => writing.has(t.name)).map(t => t.name)).toEqual([]);
    expect(TOOLS.filter(t => /^(?:add|log|create|delete|remove|set|update|edit|write|save|move|send|buy|sell|stake)[_-]/.test(t.name)).map(t => t.name)).toEqual([]);
  });
});
