import {describe, expect, test} from 'vitest';
import {flakyTests, summaryMarkdown} from './flaky-summary.mjs';

const report = {suites: [{specs: [], suites: [{specs: [
  {file: 'a.spec.ts', line: 3, title: 'passes', tests: [{status: 'expected', projectName: 'desktop'}]},
  {file: 'b.spec.ts', line: 9, title: 'flaky | piped', tests: [{status: 'flaky', projectName: 'mobile'}, {status: 'unexpected', projectName: 'desktop'}]},
]}]}]};

describe('flaky test summary (Session AP, CI retry)', () => {
  test('lists only tests that passed on their retry, with file:line and project', () => {
    expect(flakyTests(report)).toEqual([{file: 'b.spec.ts', line: 9, project: 'mobile', title: 'flaky | piped'}]);
  });
  test('the summary names the shard and escapes table pipes; none says so', () => {
    const md = summaryMarkdown(flakyTests(report), 'main shard 3');
    expect(md).toContain('| `b.spec.ts:9` | mobile | main shard 3 | flaky \\| piped |');
    expect(summaryMarkdown([], 'webkit 2/4')).toContain('None');
  });
  test('an empty or missing report has no flaky tests', () => {
    expect(flakyTests({})).toEqual([]);
    expect(flakyTests(null)).toEqual([]);
  });
});
