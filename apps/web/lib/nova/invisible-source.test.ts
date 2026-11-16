import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';

/**
 * Session AM-2 (security review): the code that decides what may leave NOVA holds no character a reader cannot see.
 * A hidden character in a pattern or a test string is written as an escape, so a review reads what the code does
 * (a tool had turned typed escapes into the characters themselves). The ranges are built from numbers here for the
 * same reason.
 */
const ROOT = join(__dirname, '..', '..');
const PLACES = ['lib/nova/handoff', 'lib/nova/agent-bridge', 'lib/nova/outbox', 'lib/nova/invisible.ts', 'lib/nova/invisible.test.ts', 'lib/ai/tools/hand-off.ts', 'lib/ai/tools/hand-off.test.ts', 'lib/ai/tools/nova-agent.ts', 'lib/ai/tools/nova-agent.test.ts', 'components/nova/handoff', 'components/nova/agent'];
const RANGES: [number, number][] = [[0xAD, 0xAD], [0x34F, 0x34F], [0x61C, 0x61C], [0x115F, 0x1160], [0x17B4, 0x17B5], [0x180B, 0x180F], [0x200B, 0x200F], [0x2028, 0x202E], [0x2060, 0x206F], [0x2800, 0x2800], [0x3164, 0x3164], [0xFE00, 0xFE0F], [0xFEFF, 0xFEFF], [0xFFA0, 0xFFA0], [0xE0000, 0xE01EF]];
const hidden = (code: number) => RANGES.some(([from, to]) => code >= from && code <= to);
const files = (path: string): string[] => statSync(path).isDirectory() ? readdirSync(path).flatMap(name => files(join(path, name))) : /\.(ts|tsx|css)$/.test(path) ? [path] : [];

test('no raw invisible character in the hand-off, agent-bridge and outbox code', () => {
  const found: string[] = [];
  for (const place of PLACES) for (const file of files(join(ROOT, place))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => { for (const ch of line) if (hidden(ch.codePointAt(0)!)) found.push(`${file.slice(ROOT.length + 1)}:${i + 1} U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`); });
  }
  expect(found).toEqual([]);
});
