// Session AB-Cloud (ADR-023): the frozen-reader proof. scripts/frozen-readers.mjs copies this file into a throwaway
// worktree of an older release (as apps/web/lib/frozen-reader.test.ts) and runs it there with that release's own code
// against records the current build wrote (FROZEN_IN). It must run unchanged on #37 (32cb9c5), #38 (e3fa408) and #39
// (6c1052b): every reader is loaded by path at run time and a module that release does not have is reported as absent,
// which means the key is ignored there (nothing in that build reads it).
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';

type Fixture = {records: Record<string, string>; checks: {key: string; module: string; spec: string; expect?: Record<string, unknown>}[]; finance?: {accounts: number; dates: number};
  layout?: {key: string; page: string; region: string; added: string; older: string[]}};
const fixture = JSON.parse(readFileSync(process.env.FROZEN_IN!, 'utf8')) as Fixture;
// A module that release does not have is absent (its key ignored there); one that exists must load, or the proof fails.
const load = async (path: string): Promise<Record<string, unknown> | null> => {
  if (!['.ts', '.tsx'].some(ext => existsSync(fileURLToPath(new URL(`${path}${ext}`, import.meta.url))))) return null;
  return await import(/* @vite-ignore */ path) as Record<string, unknown>;
};
const at = (value: unknown, path: string): unknown => path.split('.').reduce<unknown>((v, k) => v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined, value);

describe(`frozen readers at ${process.env.FROZEN_COMMIT ?? 'this checkout'}`, () => {
  test('finance: the record this build wrote is read, kept at v5 with its accounts and dates, and written back unchanged', async () => {
    const positions = await load('./positions');
    const schema = positions!.platformSchema as {parse: (v: unknown) => Record<string, unknown>};
    const raw = JSON.parse(fixture.records['zigoals:platform:v1']!);
    const read = schema.parse(raw);
    expect(read.schemaVersion).toBe(5);
    const accounts = (read.accounts as {items: unknown[]} | undefined)?.items ?? [];
    expect(accounts.length).toBe(fixture.finance!.accounts);
    const dates = (read.goals as {milestones: {targetDate?: string}[]}[]).flatMap(g => g.milestones).filter(m => m.targetDate).length;
    expect(dates).toBe(fixture.finance!.dates);
    // What that build stores after its next edit: its own parse, serialised. Version, accounts and dates survive.
    const rewritten = schema.parse(JSON.parse(JSON.stringify(read)));
    expect(rewritten.schemaVersion).toBe(5);
    expect(JSON.stringify(rewritten.accounts)).toBe(JSON.stringify(read.accounts));
    if (typeof positions!.financeVersion === 'function') expect((positions!.financeVersion as (v: unknown) => number)(read)).toBe(5);
  });
  // Session AE (ADR-027 G14): a layout this build saved with a block the release does not know. That release reads it, shows
  // its own blocks (every one of them, the unknown one ignored) and, when it saves a move of its own, keeps the unknown id.
  test('layout: an unknown block is ignored on screen and kept on save', async () => {
    const layout = fixture.layout;
    if (!layout) return;
    const mod = await load('./page-layout');
    if (!mod) { console.log(`ABSENT ${layout.key}: no layout in this release (the key is ignored)`); return; }
    type L = {pages: Record<string, unknown>};
    const parse = mod.parseLayout as (raw: string) => L, saved = mod.savedOrder as (l: L, p: string, r: string) => string[] | undefined;
    const resolve = mod.resolveOrder as (d: readonly string[], s?: readonly string[]) => string[];
    const move = mod.moveInList as (o: readonly string[], id: string, to: number) => string[], set = mod.setRegionOrder as (l: L, p: string, r: string, o: readonly string[]) => L;
    const read = parse(fixture.records[layout.key]!);
    expect(saved(read, layout.page, layout.region)).toContain(layout.added);
    const shown = resolve(layout.older, saved(read, layout.page, layout.region));
    expect(shown).not.toContain(layout.added);
    expect([...shown].sort()).toEqual([...layout.older].sort());
    const after = set(read, layout.page, layout.region, move(shown, shown[shown.length - 1]!, 0));
    expect(saved(after, layout.page, layout.region)).toContain(layout.added);
    console.log(`READ ${layout.key}: ${layout.added} ignored on screen, kept on save`);
  });
  for (const check of fixture.checks) {
    test(`${check.key}: read by ${check.module} (${check.spec}) or ignored`, async () => {
      const mod = await load(check.module);
      const spec = mod?.[check.spec] as {schema: {safeParse: (v: unknown) => {success: boolean; data?: unknown}}} | undefined;
      if (!spec) { console.log(`ABSENT ${check.key}: no reader in this release (the key is ignored)`); return; }
      const parsed = spec.schema.safeParse(JSON.parse(fixture.records[check.key]!));
      expect(parsed.success, `${check.key} refused`).toBe(true);
      for (const [path, value] of Object.entries(check.expect ?? {})) expect(at(parsed.data, path)).toEqual(value);
      console.log(`READ ${check.key}`);
    });
  }
});
