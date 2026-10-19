import {describe, expect, it} from 'vitest';
import {createElement, type ComponentType} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {ValdoraStake, ValdoraVault} from '../../components/earn/illustrations/valdora';
import {OroswapPools, OroswapSwap} from '../../components/earn/illustrations/oroswap';
import {KeplrStaking} from '../../components/earn/illustrations/keplr';
import {SkipGo} from '../../components/earn/illustrations/skip-go';
import {NawaVaults} from '../../components/earn/illustrations/nawa';

/**
 * Session AF chunk 2 (P1.18): the redrawn "what you'll see" screens (docs/earn/ILLUSTRATIONS.md). Each screen is inline SVG
 * under 6 KB, labelled for screen readers, numbered, with the step in words beside it; nothing in them is a figure (no
 * rate, no amount: "0.00" placeholders and the word "amount" only), a logo or a link, and nothing moves.
 */
const SETS: [string, ComponentType, number][] = [['valdora-stake', ValdoraStake, 4], ['valdora-vault', ValdoraVault, 3], ['oroswap-swap', OroswapSwap, 3], ['oroswap-pools', OroswapPools, 2], ['keplr-staking', KeplrStaking, 2], ['skip-go', SkipGo, 2], ['nawa-vaults', NawaVaults, 1]];
describe('the illustrations', () => {
  it.each(SETS)('%s: numbered screens, each a labelled SVG under 6 KB, with no figure, logo, link or motion', (_name, C, count) => {
    const html = renderToStaticMarkup(createElement(C)), doc = new JSDOM(html).window.document;
    const screens = [...doc.querySelectorAll('.earn-illustration-screens > li')];
    expect(screens).toHaveLength(count);
    for (const [i, li] of screens.entries()) {
      const svg = li.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toMatch(new RegExp(`, step ${i + 1}: `));
      expect(svg.outerHTML.length).toBeLessThan(6144);
      // One gold mark, numbered as its screen, points at the control of that step.
      expect([...svg.querySelectorAll('.il-mark text')].map(t => t.textContent)).toEqual([String(i + 1)]);
      expect(li.querySelector('p')!.textContent!.length).toBeGreaterThan(30);
      const words = [...svg.querySelectorAll('text')].map(t => t.textContent ?? '').join(' ');
      expect(words).not.toMatch(/\d+(\.\d+)?\s?%\s?APR|\$\s?\d|\d{2,}[.,]\d+\s?(ZIG|USDC|stZIG)/);
    }
    expect(html).not.toMatch(/<a\b|<image|<img|<animate|https?:/);
    expect(doc.querySelector('.earn-illustration-note')!.textContent).toMatch(/Redrawn by ZIGoals from .+’s own page as it looked on Oct 18, 2026/);
  });
});
