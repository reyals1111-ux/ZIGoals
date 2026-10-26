import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {boundedDiff, commentBody, MARKER, reviewRequest} from './review.mjs';

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
