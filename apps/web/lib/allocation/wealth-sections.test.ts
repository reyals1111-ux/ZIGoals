// @vitest-environment jsdom
import {afterEach, expect, test, vi} from 'vitest';
import {WEALTH_VIEWS, showSection} from '../../components/platform/wealth-view';

/**
 * Session AK (lane WW): /app/wealth?view=bills (the notification plan's link), view=budgets and view=purpose each land on
 * their section: the hash is set without a new history entry (Next's own markers are not copied), a folded phone section
 * hears the hashchange and opens, the page scrolls there and the section's heading takes focus. A section still loading
 * is waited for, a frame at a time.
 */
afterEach(() => { document.body.innerHTML = ''; window.history.replaceState(null, '', '/'); vi.restoreAllMocks(); });

test('each view names a section anchor', () => {
  expect(WEALTH_VIEWS).toMatchObject({bills: 'bills', budgets: 'budgets', purpose: 'purpose'});
});

test('the section is shown once it is on the page, with focus on its heading', async () => {
  window.history.replaceState({kept: 1, __NA: true}, '', '/app/wealth');
  const scrolled: string[] = [], hashes: string[] = [];
  window.addEventListener('hashchange', () => hashes.push(window.location.hash), {once: true});
  showSection('bills');
  expect(window.location.hash).toBe('');
  const section = document.createElement('section'); section.id = 'bills';
  section.scrollIntoView = () => { scrolled.push('bills'); };
  const heading = document.createElement('h2'); heading.id = 'bills-title'; heading.tabIndex = -1; section.append(heading);
  document.body.append(section);
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => requestAnimationFrame(() => r(null)));
  expect(scrolled).toEqual(['bills']);
  expect(hashes).toEqual(['#bills']);
  expect(window.location.pathname + window.location.hash).toBe('/app/wealth#bills');
  expect(window.history.state).toEqual({kept: 1});
  expect(document.activeElement).toBe(heading);
});
