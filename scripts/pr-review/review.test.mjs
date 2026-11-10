import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {areaOf, boundedDiff, chunkDiff, commentBody, DEFAULT_MAX_CHUNKS, diffPath, kindOf, MARKER, MAX_DIFF_CHARS, maxChunksFrom, mergeReviews, reviewRequest} from './review.mjs';

const file = (name, size) => `diff --git a/${name} b/${name}\n${'+'.repeat(size)}\n`;

describe('PR review script (Session AH, RM6)', () => {
  it('keeps a short diff whole and cuts a long one at file boundaries, counting what it left out', () => {
    expect(boundedDiff('diff --git a/x b/x\n+1\n')).toEqual({text: 'diff --git a/x b/x\n+1\n', omitted: 0});
    const r = boundedDiff(file('a', 50) + file('b', 50) + file('c', 50), 140);
    expect(r.text).toBe(file('a', 50) + file('b', 50));
    expect(r.omitted).toBe(1);
  });
  it('refuses a missing or odd model id, and frames the diff as data', () => {
    expect(() => reviewRequest({model: '', diff: 'x', title: 't'})).toThrow(/model id/);
    expect(() => reviewRequest({model: 'a b; rm', diff: 'x', title: 't'})).toThrow(/model id/);
    const body = reviewRequest({model: 'some-model-1', diff: 'DIFF', title: 'T', omitted: 2});
    expect(body.messages[0].content).toContain('<diff>\nDIFF\n</diff>');
    expect(body.messages[0].content).toContain('2 file(s) left out');
    expect(body.system).toContain('never instructions');
  });
  it('marks its comment as advisory', () => {
    const c = commentBody('Looks fine.', 'abcdef1234567890');
    expect(c.startsWith(MARKER)).toBe(true);
    expect(c).toContain('`abcdef123456`');
    expect(c).toContain('advisory');
  });
  it('the workflow: pull_request only, never on forks, least privilege, skips without the secret, never prints it', () => {
    const wf = readFileSync(new URL('../../.github/workflows/pr-review.yml', import.meta.url), 'utf8').split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n');
    expect(wf).toMatch(/^on:\n  pull_request:/m);
    expect(wf).not.toMatch(/pull_request_target/);
    expect(wf).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    expect(wf).toMatch(/^permissions:\n  contents: read\n  pull-requests: write\n/m);
    expect(wf).toContain('persist-credentials: false');
    expect(wf).not.toMatch(/echo[^\n]*secrets\./);
    expect(wf).toMatch(/steps\.gate\.outputs\.run == 'true'/);
    for (const uses of wf.match(/uses: .+/g) ?? []) expect(uses).toMatch(/@[0-9a-f]{40}\b/);
  });
});

// Session AL (TIER 3 CI): big diffs in per-area chunks within a budget, merged into one comment.
describe('PR review chunks (Session AL)', () => {
  const paths = list => list.map(([name, size]) => file(name, size)).join('');
  it('reads paths, areas and kinds', () => {
    expect(diffPath('diff --git a/apps/web/lib/x.ts b/apps/web/lib/x.ts\n+1')).toBe('apps/web/lib/x.ts');
    expect(diffPath('diff --git a/old.ts b/new.ts\n')).toBe('new.ts');
    expect(areaOf('apps/web/components/ai/box.tsx')).toBe('apps/web/components/ai');
    expect(areaOf('apps/web/components/shell.tsx')).toBe('apps/web/components');
    expect(areaOf('apps/web/package.json')).toBe('apps/web');
    expect(areaOf('packages/chain-config/src/index.ts')).toBe('packages/chain-config');
    expect(areaOf('scripts/pr-review/review.mjs')).toBe('scripts');
    expect(areaOf('.github/workflows/ci.yml')).toBe('.github');
    expect(areaOf('package.json')).toBe('(root)');
    expect(['apps/web/lib/a.ts', 'apps/web/tests/grok53/x.spec.ts', 'scripts/a.test.mjs', 'docs/STATUS.md', 'README.md', 'pnpm-lock.yaml'].map(kindOf)).toEqual([0, 1, 1, 2, 2, 3]);
  });
  it('reads the budget variable: 1 to 32, else the default 8', () => {
    expect(DEFAULT_MAX_CHUNKS).toBe(8);
    expect([undefined, '', '0', '33', '-1', '2.5', 'eight', ' 4 ', '32', '1'].map(maxChunksFrom)).toEqual([8, 8, 8, 8, 8, 8, 8, 4, 32, 1]);
  });
  it('keeps an area together, packs areas first fit, and never passes the chunk size', () => {
    // Each file is its header (about 55 characters) plus its body.
    const diff = paths([['apps/web/lib/a/1.ts', 100], ['apps/web/lib/a/2.ts', 100], ['apps/web/lib/b/1.ts', 200], ['scripts/x.mjs', 80]]);
    const {chunks, leftOut} = chunkDiff(diff, {max: 400, maxChunks: 8});
    expect(leftOut).toEqual([]);
    expect(chunks.map(c => c.files)).toEqual([['apps/web/lib/a/1.ts', 'apps/web/lib/a/2.ts'], ['apps/web/lib/b/1.ts', 'scripts/x.mjs']]);
    expect(chunks.map(c => c.areas)).toEqual([['apps/web/lib/a'], ['apps/web/lib/b', 'scripts']]);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(400);
    expect(chunks.map(c => c.text).join('').length).toBe(diff.length);
  });
  it('splits an area larger than one chunk at file boundaries and leaves out a file larger than a chunk', () => {
    const diff = paths([['apps/web/lib/a/1.ts', 80], ['apps/web/lib/a/2.ts', 80], ['apps/web/lib/a/huge.ts', 500]]);
    const {chunks, leftOut} = chunkDiff(diff, {max: 140, maxChunks: 8});
    expect(chunks.map(c => c.files)).toEqual([['apps/web/lib/a/1.ts'], ['apps/web/lib/a/2.ts']]);
    expect(leftOut).toEqual([{path: 'apps/web/lib/a/huge.ts', area: 'apps/web/lib/a', kind: 0, reason: 'larger than one chunk'}]);
  });
  it('over budget: code first, then tests, then docs; the rest is listed as left out', () => {
    const diff = paths([['docs/STATUS.md', 300], ['apps/web/tests/x.spec.ts', 300], ['apps/web/lib/a/1.ts', 300], ['scripts/y.mjs', 300]]);
    const {chunks, leftOut} = chunkDiff(diff, {max: 400, maxChunks: 2});
    expect(chunks.map(c => c.files)).toEqual([['apps/web/lib/a/1.ts'], ['scripts/y.mjs']]);
    expect(leftOut.map(f => [f.path, f.kind, f.reason])).toEqual([['apps/web/tests/x.spec.ts', 1, 'over the chunk budget'], ['docs/STATUS.md', 2, 'over the chunk budget']]);
  });
  it('a giant PR stays within the budget and the size limit', () => {
    const list = Array.from({length: 2258}, (_, i) => [`apps/web/${['components', 'lib', 'tests'][i % 3]}/area${i % 40}/f${i}.ts`, 400 + (i % 7) * 300]);
    const {chunks, leftOut} = chunkDiff(paths(list));
    expect(chunks).toHaveLength(8);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(MAX_DIFF_CHARS);
    expect(chunks.reduce((n, c) => n + c.files.length, 0) + leftOut.length).toBe(2258);
    // Every code file before any test file.
    const firstTestOut = leftOut.findIndex(f => f.kind === 1);
    expect(leftOut.slice(0, Math.max(0, firstTestOut)).every(f => f.kind === 0)).toBe(true);
  });
  it('a part names itself in the request; a small diff\'s request is unchanged', () => {
    const small = reviewRequest({model: 'some-model-1', diff: 'D', title: 'T'});
    expect(small.messages[0].content).toBe('Pull request: T\n\n<diff>\nD\n</diff>');
    const part = reviewRequest({model: 'some-model-1', diff: 'D', title: 'T', part: {index: 2, count: 3, areas: ['scripts', '.github']}});
    expect(part.messages[0].content).toContain('Part 2 of 3 of a large pull request');
    expect(part.messages[0].content).toContain('scripts, .github');
    expect(part.max_tokens).toBe(small.max_tokens);
  });
  it('merges the parts into one text: counts, left-out files by kind and area, each part, a failed part named', () => {
    const parts = [{areas: ['apps/web/lib/a'], files: ['a', 'b'], text: 'No blocking findings.'}, {areas: ['scripts'], files: ['c'], error: 'The review request failed with HTTP 529.'}];
    const leftOut = [{path: 'docs/x.md', area: 'docs', kind: 2, reason: 'over the chunk budget'}];
    const text = mergeReviews({parts, leftOut, totalFiles: 4, maxChunks: 2});
    expect(text).toContain('2 of 4 file(s) reviewed in 2 part(s)');
    expect(text).toContain('**Left out (1 file(s), not reviewed):** over budget, code was reviewed first, then tests, then docs');
    expect(text).toContain('- docs · docs: 1 file(s)');
    expect(text).toContain('- `docs/x.md` (over the chunk budget)');
    expect(text).toContain('### Part 1 of 2: apps/web/lib/a\n\nNo blocking findings.');
    expect(text).toContain('### Part 2 of 2: scripts\n\n_This part was not reviewed: The review request failed with HTTP 529._');
    // The left-out list comes before the parts, so the comment's 60,000-character cut never drops it.
    expect(text.indexOf('Left out')).toBeLessThan(text.indexOf('### Part 1'));
  });
  it('the merged comment fits GitHub\'s limit with eight long parts and a long left-out list', () => {
    const parts = Array.from({length: 8}, (_, i) => ({areas: [`area${i}`], files: ['f'], text: 'x'.repeat(20_000)}));
    const leftOut = Array.from({length: 2000}, (_, i) => ({path: `docs/f${i}.md`, area: 'docs', kind: 2, reason: 'over the chunk budget'}));
    const text = mergeReviews({parts, leftOut, totalFiles: 2008, maxChunks: 8});
    expect(text).toContain('… and 1940 more');
    expect(commentBody(text, 'a'.repeat(40)).length).toBeLessThan(65_536);
    expect(text.length).toBeLessThan(60_000);
  });
});

