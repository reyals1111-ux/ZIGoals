import {expect, test} from 'vitest';
import {readFile} from 'node:fs/promises';
import {compare, gzipBytes, loopbackOrigin, scriptSources} from './check-weight-budget.mjs';

// Session W Part 22: the page weight check reads only a loopback production server and fails a page or the shell that
// goes over its budget.
test('only a loopback origin is measured', () => {
  expect(loopbackOrigin('http://127.0.0.1:3100')).toBe('http://127.0.0.1:3100');
  expect(loopbackOrigin('http://localhost:3101/')).toBe('http://localhost:3101');
  for (const bad of ['https://alpha.zigoals.app', 'http://192.0.2.1:3100', 'http://127.0.0.1:3100/app', 'http://user:pw@127.0.0.1:3100', 'not a url']) expect(() => loopbackOrigin(bad), bad).toThrow();
});
test('the scripts a page loads: same origin, Next\'s own files, each once, in order', () => {
  const html = '<script src="/_next/static/chunks/a.js" async=""></script><script nonce="x" src="/_next/static/chunks/b.js"></script><script src="/_next/static/chunks/a.js"></script><script src="https://cdn.example/c.js"></script><script>inline()</script><script src="/other.js"></script>';
  expect(scriptSources(html, 'http://127.0.0.1:3100')).toEqual(['/_next/static/chunks/a.js', '/_next/static/chunks/b.js']);
});
test('a page or the shell over budget fails; a page without a budget fails too', () => {
  const budgets = {pages: {'/app': {main: 100, budget: 120}, '/app/goals': {main: 90, budget: 100}}, shell: {main: 50, budget: 60}};
  const ok = compare({pages: {'/app': 120, '/app/goals': 95}, shell: 60}, budgets);
  expect(ok.over).toEqual([]); expect(ok.missing).toEqual([]);
  const over = compare({pages: {'/app': 121, '/app/goals': 95, '/app/new': 10}, shell: 61}, budgets);
  expect(over.over.map(r => r.name)).toEqual(['/app', '/app/new', 'shell (on every page)']);
  expect(compare({pages: {'/app': 1}, shell: 1}, budgets).missing).toEqual(['/app/goals']);
  expect(gzipBytes(Buffer.from('a'.repeat(1000)))).toBeLessThan(40);
});
test('the budgets file names main\'s number and a budget for every page and the shell', async () => {
  const budgets = JSON.parse(await readFile(new URL('./weight-budgets.json', import.meta.url), 'utf8'));
  expect(Object.keys(budgets.pages).length).toBeGreaterThanOrEqual(10);
  for (const [name, b] of [...Object.entries(budgets.pages), ['shell', budgets.shell]]) {
    expect(Number.isInteger(b.budget) && b.budget > 0, name).toBe(true);
    if (b.main !== null) expect(Number.isInteger(b.main) && b.main > 0, name).toBe(true);
  }
});
