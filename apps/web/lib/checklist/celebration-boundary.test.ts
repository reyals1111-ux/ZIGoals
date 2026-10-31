// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, createElement, lazy, Suspense} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {LoadBoundary} from '../../components/load-boundary';

// Session AK (journey bug J4-1): offline, the day's celebration chunk (its stylesheet) was never cached, its lazy load
// failed, and with no boundary of its own the failure took the whole Checklist down ("This page could not be shown").
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('a quiet LoadBoundary keeps a failed chunk to itself, renders nothing in its place and tells its owner once', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Failing = lazy(() => Promise.reject(Object.assign(new Error('Failed to load chunk /_next/static/chunks/x.css'), {name: 'ChunkLoadError'})));
  const onFail = vi.fn();
  await act(async () => root.render(createElement('main', null, createElement('p', null, 'The path'),
    createElement(LoadBoundary, {quiet: true, onFail, children: createElement(Suspense, {fallback: null}, createElement(Failing))}))));
  expect(element.textContent).toBe('The path');
  expect(element.querySelector('[role="status"]')).toBeNull();
  expect(onFail).toHaveBeenCalledTimes(1);
});

test('the Checklist loads its day celebration inside a quiet LoadBoundary that closes it on failure', () => {
  const source = readFileSync(join(__dirname, '..', '..', 'components', 'checklist', 'checklist-page.tsx'), 'utf8');
  const line = source.split('\n').find(l => l.includes('<DayCelebration '));
  expect(line).toBeDefined();
  expect(line).toMatch(/<LoadBoundary quiet onFail=\{\(\) => \{ setCelebrate\(false\);[^}]*\}\}><Suspense fallback=\{null\}><DayCelebration /);
  expect(line).toContain('</Suspense></LoadBoundary>');
});
