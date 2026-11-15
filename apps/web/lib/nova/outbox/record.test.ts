import {describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../../device-record';
import {MAX_OUTBOX, MAX_OUTBOX_TARGET, MAX_OUTBOX_WHAT, NOVA_OUTBOX, NOVA_OUTBOX_KEY, appendOutbox, clearOutbox, emptyOutbox, forgetOutbox, noteOutbox, novaOutboxSchema, outboxOf, type OutboxEntry} from './record';

const at = (i: number) => new Date(Date.UTC(2026, 10, 15, 9, 0, i)).toISOString();
const entry = (i: number, more: Partial<OutboxEntry> = {}): OutboxEntry => ({at: at(i), kind: 'handoff', what: 'Email draft', target: 'fictional@example.com', ok: true, ...more});
const memory = (initial: Record<string, string> = {}) => {
  const m = new Map(Object.entries(initial));
  return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}};
};

describe('NOVA\'s outbox record (zigoals:nova-outbox:v1)', () => {
  test('the key, the empty value and the bounds', () => {
    expect(NOVA_OUTBOX_KEY).toBe('zigoals:nova-outbox:v1');
    expect(emptyOutbox()).toEqual({version: 1});
    expect(novaOutboxSchema.parse(emptyOutbox())).toEqual({version: 1});
    expect([MAX_OUTBOX, MAX_OUTBOX_WHAT, MAX_OUTBOX_TARGET]).toEqual([200, 60, 160]);
    expect(outboxOf(emptyOutbox())).toEqual([]);
  });
  test('an entry is added newest first, for a hand-off and for a tool call, and the input is not changed', () => {
    const empty = emptyOutbox();
    const one = appendOutbox(empty, entry(1));
    const two = appendOutbox(one, entry(2, {kind: 'tool', what: 'search_notes', target: '127.0.0.1:8765', ok: false}));
    expect(empty).toEqual({version: 1});
    expect(outboxOf(two)).toEqual([{at: at(2), kind: 'tool', what: 'search_notes', target: '127.0.0.1:8765', ok: false}, {at: at(1), kind: 'handoff', what: 'Email draft', target: 'fictional@example.com', ok: true}]);
    expect(novaOutboxSchema.parse(two)).toEqual(two);
  });
  test('the list keeps the newest 200', () => {
    let r = emptyOutbox();
    for (let i = 0; i < MAX_OUTBOX + 25; i++) r = appendOutbox(r, {...entry(0), at: new Date(Date.UTC(2026, 10, 15, 9, 0, 0) + i * 1000).toISOString(), target: `host-${i}.example`});
    expect(outboxOf(r)).toHaveLength(MAX_OUTBOX);
    expect(outboxOf(r)[0]!.target).toBe(`host-${MAX_OUTBOX + 24}.example`);
    expect(outboxOf(r)[MAX_OUTBOX - 1]!.target).toBe('host-25.example');
  });
  test('an entry holds exactly the five fields: a body, arguments or a result handed in by mistake are never stored', () => {
    const r = appendOutbox(emptyOutbox(), {...entry(1), body: 'Fictional body text', args: {q: 'private'}, result: 'x'} as OutboxEntry);
    expect(Object.keys(outboxOf(r)[0]!).sort()).toEqual(['at', 'kind', 'ok', 'target', 'what']);
    expect(JSON.stringify(r)).not.toContain('Fictional body text');
    expect(JSON.stringify(r)).not.toContain('private');
  });
  test('words are one plain bounded line: control, direction-override and invisible characters never reach the record', () => {
    const r = appendOutbox(emptyOutbox(), entry(1, {what: `  Email\n\tdraft\u0000 ${'x'.repeat(200)}`, target: `evil‮moc.elpmaxe⁦@​example.com\r\n${'y'.repeat(400)}`}));
    const [e] = outboxOf(r);
    expect(e!.what.length).toBeLessThanOrEqual(MAX_OUTBOX_WHAT);
    expect(e!.target.length).toBeLessThanOrEqual(MAX_OUTBOX_TARGET);
    expect(e!.what.startsWith('Email draft x')).toBe(true);
    expect(e!.target.startsWith('evil moc.elpmaxe @ example.com y')).toBe(true);
    for (const text of [e!.what, e!.target]) expect(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/.test(text)).toBe(false);
  });
  test('an entry that is not one is not added: no words, no time, an unknown kind; "ok" is true only when it is exactly true', () => {
    const base = appendOutbox(emptyOutbox(), entry(1));
    for (const bad of [entry(2, {what: '  \n '}), entry(2, {at: 'yesterday'}), entry(2, {kind: 'email' as 'handoff'}), {...entry(2), at: undefined as unknown as string}]) expect(appendOutbox(base, bad)).toBe(base);
    expect(outboxOf(appendOutbox(base, entry(3, {ok: 'yes' as unknown as boolean})))[0]!.ok).toBe(false);
    expect(outboxOf(appendOutbox(base, entry(3, {target: ''})))[0]!.target).toBe('');
  });
  test('clearing forgets the list and keeps the record (and a field a later build added)', () => {
    const r = {...appendOutbox(emptyOutbox(), entry(1)), later: 1};
    expect(clearOutbox(r)).toEqual({version: 1, later: 1});
    expect(r.entries).toHaveLength(1);
  });
  test('a tolerant, bounded read: an entry a later build wrote is left out, an over-long list keeps its first 200, another version is refused', () => {
    const good = entry(1), later = {at: at(2), kind: 'agent', what: 'later', target: '', ok: true};
    expect(novaOutboxSchema.parse({version: 1, entries: [later, good, 'text', null, {...good, what: 'x'.repeat(MAX_OUTBOX_WHAT + 1)}, {...good, target: 'a‮b'}]})).toEqual({version: 1, entries: [good]});
    expect(novaOutboxSchema.parse({version: 1, entries: Array.from({length: 500}, (_, i) => entry(i % 60))}).entries).toHaveLength(MAX_OUTBOX);
    for (const refused of [{version: 2}, {entries: []}, {version: 1, entries: 'x'}, null, []]) expect(novaOutboxSchema.safeParse(refused).success, JSON.stringify(refused)).toBe(false);
    // A field a later build adds to an entry or to the record is kept as it is.
    expect(novaOutboxSchema.parse({version: 1, later: true, entries: [{...good, via: 'share'}]})).toEqual({version: 1, later: true, entries: [{...good, via: 'share'}]});
  });
  test('on the device: an entry is written to the record; an unreadable record is left byte for byte; a refused write changes nothing and never throws', () => {
    const {m, storage} = memory();
    expect(noteOutbox(storage, entry(1))).toBe(true);
    expect(noteOutbox(storage, entry(2, {kind: 'tool', what: 'list_files', target: 'localhost:3333'}))).toBe(true);
    expect(outboxOf(readDeviceRecord(storage, NOVA_OUTBOX).data).map(e => e.what)).toEqual(['list_files', 'Email draft']);
    expect(noteOutbox(storage, entry(3, {what: ''}))).toBe(false);
    expect(outboxOf(readDeviceRecord(storage, NOVA_OUTBOX).data)).toHaveLength(2);
    expect(forgetOutbox(storage)).toBe(true);
    expect(JSON.parse(m.get(NOVA_OUTBOX_KEY)!)).toEqual({version: 1});
    const broken = memory({[NOVA_OUTBOX_KEY]: '{not json'});
    expect(noteOutbox(broken.storage, entry(1))).toBe(false);
    expect(broken.m.get(NOVA_OUTBOX_KEY)).toBe('{not json');
    const full = {getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }};
    expect(noteOutbox(full, entry(1))).toBe(false);
    expect(forgetOutbox(full)).toBe(false);
    const locked = {getItem: () => { throw new Error('SecurityError'); }, setItem: () => undefined};
    expect(noteOutbox(locked, entry(1))).toBe(false);
  });
});
