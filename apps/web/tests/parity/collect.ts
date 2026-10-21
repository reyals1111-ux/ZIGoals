import type {Page} from '@playwright/test';
import type {Item} from './classify';

/**
 * Session AF (L5a, Part 10.13, ADR-028 H75): the theme parity collector. In the page, every element matching SELECTORS
 * (up to CAP) gives its computed colours, opacity and filter, and its box in page coordinates; its path is its chain of
 * child indexes from <body>, so the same element is found again in another theme (the DOM is the same in every theme).
 * Pure reading: nothing on the page changes.
 */
export const SELECTORS = ['body', '.app-sidebar', '.app-content', 'header', 'main', 'section', 'article', 'aside', 'nav', 'dialog', 'footer', '.panel', '.today-hero', '.site-footer',
  'button', 'a', '.primary', '.secondary', '.quiet', '.pill', '.chip', '.picker-tabs button', 'input', 'select', 'textarea', 'label', 'summary',
  '.habit-dot', '.life-ring', '.life-ring *', '.progress-ring', '.progress-ring *', '.glass-bar', '.glass-bar *', '.glass-ring', '.glass-ring *', '.nebula-flow', '.goal-card', '.focus-tile',
  '[data-pillar]', '[data-tone]', '.pillar-mark-disc', '.orbit-art', '.orbit-art *', '.today-scene', '.wealth-hero-scene', '.header-art-slot', '.pillar-hero-art', '.site-footer-art',
  'svg', 'svg path', 'svg circle', 'svg rect', 'svg line', 'svg polyline', 'svg ellipse', 'svg stop', 'svg text', 'canvas', 'img', 'h1', 'h2', 'h3', 'h4', 'p', 'small', 'strong', 'li', 'dd', 'dt', 'td', 'th'].join(', ');
export const CAP = 2600;
/** The heavy art layers whose opacity and filter calm by day (H75 "calm on named art layers"). */
export const ART = '.today-scene, .wealth-hero-scene, .header-art-slot, .pillar-hero-art, .site-footer-art, .app-content, .app-sidebar';
/** The page's own ground. */
export const GROUND = 'body, .app-content, .site-footer';
export const PROPS = ['color', '-webkit-text-fill-color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke', 'stop-color', 'box-shadow', 'text-shadow', 'outline-color', 'opacity', 'filter'];

/** Runs in the page (self-contained). */
export function collectInPage({selectors, cap, art, ground, props}: {selectors: string; cap: number; art: string; ground: string; props: string[]}): Item[] {
  const pathOf = (el: Element) => { const parts: number[] = []; for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) parts.unshift(e.parentElement ? [...e.parentElement.children].indexOf(e) : 0); return parts.join('.'); };
  const descOf = (el: Element) => { const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 3).map(c => `.${c}`).join(''); const host = el.closest('[id]'); return `${host && host !== el ? `#${host.id} ` : ''}${el.tagName.toLowerCase()}${cls}`; };
  const els = [...document.querySelectorAll(selectors)].slice(0, cap);
  return els.map(el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const out: Record<string, string> = {}; for (const p of props) out[p] = cs.getPropertyValue(p);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && (n.textContent ?? '').trim());
    return {path: pathOf(el), desc: descOf(el), text: own, clip: /text/.test(cs.getPropertyValue('background-clip') + cs.getPropertyValue('-webkit-background-clip')), art: el.matches(art), ground: el.matches(ground), bar: !!el.closest('.theme-switch-wrap'), svgText: el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'tspan', props: out,
      box: [Math.round((r.x + scrollX) * 10) / 10, Math.round((r.y + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]};
  });
}

export const collect = (page: Page) => page.evaluate(collectInPage, {selectors: SELECTORS, cap: CAP, art: ART, ground: GROUND, props: PROPS});
