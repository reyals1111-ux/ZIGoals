// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import PortionCounters from '../../components/health/food-plus/portion-counters';

/**
 * Session AW (p5-fixes; FR-TJ-20): Health → Diary's "Portions today" card was mostly empty space around one link. With
 * no counter chosen it is now one teaching line (no card) with "Choose what to count"; choosing opens the full card in
 * the same section, and with counters it is the card as before.
 */
let root: Root;
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; localStorage.clear(); });
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
const button = (name: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === name) ?? null;

describe('FR-TJ-20: Portions with nothing chosen is one teaching line', () => {
  test('one line, no card, named by its title, with the link that opens the choices', async () => {
    await act(async () => { root.render(h(PortionCounters, {date: '2026-11-23', today: '2026-11-23'})); });
    await settle();
    const section = document.querySelector('section.r6-portions')!;
    expect(section).not.toBeNull();
    expect(section.classList.contains('panel')).toBe(false);
    expect(section.classList.contains('r6-portions-empty')).toBe(true);
    expect(document.getElementById(section.getAttribute('aria-labelledby')!)?.textContent).toBe('Portions today');
    expect(section.querySelectorAll('p.r6-portions-teach')).toHaveLength(1);
    expect(section.textContent).toContain('None is on until you choose it');
    expect(section.querySelectorAll('ul, fieldset')).toHaveLength(0);
    await act(async () => { button('Choose what to count')!.click(); });
    const open = document.querySelector('section.r6-portions')!;
    expect(open.classList.contains('panel')).toBe(true);
    expect(open.querySelector('fieldset legend')?.textContent).toBe('Count these');
    // Done with nothing chosen goes back to the one line, the focus on its link.
    await act(async () => { button('Done')!.click(); await new Promise(r => requestAnimationFrame(() => r(null))); });
    expect(document.querySelector('section.r6-portions')?.classList.contains('r6-portions-empty')).toBe(true);
    expect(document.activeElement?.textContent).toBe('Choose what to count');
  });
  test('a chosen counter shows the card as before', async () => {
    await act(async () => { root.render(h(PortionCounters, {date: '2026-11-23', today: '2026-11-23'})); });
    await settle();
    await act(async () => { button('Choose what to count')!.click(); });
    const veg = [...document.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].find(i => i.parentElement?.textContent?.includes('Vegetables'))!;
    await act(async () => { veg.click(); });
    await act(async () => { button('Done')!.click(); });
    const card = document.querySelector('section.r6-portions')!;
    expect(card.classList.contains('panel')).toBe(true);
    expect(card.querySelector('h3')?.textContent).toBe('Portions today');
    expect(card.querySelector('[aria-label="One more: Vegetables"]')).not.toBeNull();
  });
});
