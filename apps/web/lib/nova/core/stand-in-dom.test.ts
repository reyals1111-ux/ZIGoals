// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {NovaStage} from '../../../components/nova/nova-stage';
import {STAR_NO_CODE_TEXT, STAR_WAIT_MS} from './no-code';
import {STAR_WHY} from './governor';
import type {NovaCounts} from '../../../components/nova/use-counts';
import type {Persona} from '../store';

/**
 * Session AR (ADR-041 P4; ADR-038 Q12, carried): what stands in the star's place until it reports. Before, the small SVG
 * orb stood there (a different object from the galaxy), and a star whose code never loaded left it with no line saying why.
 */
let root: Root, host: HTMLElement;
const persona = {name: 'NOVA', avatar: 'orb'} as unknown as Persona, counts = {} as NovaCounts;
const stage = (props: Record<string, unknown>) => h(NovaStage, {persona, orb: 'idle', greeting: 'Good evening.', typingFrom: null, counts, showcase: false, onTalk: () => undefined, talkOpen: false, starBox: 240, starSize: 520, ...props} as never);
const draw = async (props: Record<string, unknown>) => { await act(async () => { root.render(stage(props)); }); };
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

test('while the star starts: its own place, bezel and a dim core — the star’s box from the first paint, no line', async () => {
  await draw({starStandIn: 'starting'});
  const button = host.querySelector<HTMLElement>('.nova-orb-button')!;
  expect(button.dataset.star).toBe('');
  expect(button.dataset.starStandin).toBe('starting');
  expect(button.style.getPropertyValue('--star-box')).toBe('240px');
  expect(host.querySelector('.cc-bezel')).not.toBeNull();
  const standIn = host.querySelector<HTMLElement>('.nova-star-standin')!;
  expect(standIn.dataset.kind).toBe('starting');
  expect(standIn.getAttribute('aria-hidden')).toBe('true');
  expect(standIn.querySelector('img')).toBeNull();
  expect(host.querySelector('.nova-star-why')).toBeNull();
  // The button keeps its name and its state in words.
  expect(button.textContent).toContain('Talk to NOVA');
  expect(host.querySelector('#nova-orb-state')!.textContent).toContain('Tap to talk');
});

test('a star whose code did not load: the galaxy’s still picture in the accent, and the honest line', async () => {
  await draw({starStandIn: 'picture', accent: 'gold', starWhy: {kind: 'picture', text: STAR_NO_CODE_TEXT}});
  const img = host.querySelector<HTMLImageElement>('.nova-star-standin[data-kind=picture] img')!;
  expect(img.getAttribute('src')).toBe('/nova/star/gold.webp');
  expect(img.getAttribute('alt')).toBe('');
  expect(host.querySelector('.nova-star-why')!.textContent).toBe('Still picture: the star’s code did not load');
  expect(host.querySelector('.nova-star-why')!.getAttribute('data-kind')).toBe('picture');
  // An accent without a picture of its own shows the violet one.
  await draw({starStandIn: 'picture', accent: 'unheard-of'});
  expect(host.querySelector('.nova-star-standin img')!.getAttribute('src')).toBe('/nova/star/violet.webp');
});

test('if the picture cannot load either, the SVG orb is the last resort; once the star reports, the stand-in is gone', async () => {
  await draw({starStandIn: 'picture'});
  await act(async () => { host.querySelector('.nova-star-standin img')!.dispatchEvent(new Event('error')); });
  expect(host.querySelector('.nova-star-standin')).toBeNull();
  expect(host.querySelector<HTMLElement>('.nova-orb-button')!.dataset.star).toBeUndefined();
  expect(host.querySelector('.nova-orb')).not.toBeNull();
  await draw({starOn: true, starStandIn: undefined});
  expect(host.querySelector('.nova-star-standin')).toBeNull();
  expect(host.querySelector<HTMLElement>('.nova-orb-button')!.dataset.star).toBe('');
});

test('ZIGi as NOVA’s face has no star and no stand-in', async () => {
  await draw({persona: {name: 'NOVA', avatar: 'zigi'}, starStandIn: 'starting'});
  expect(host.querySelector('.nova-star-standin')).toBeNull();
  expect(host.querySelector<HTMLElement>('.nova-orb-button')!.dataset.star).toBeUndefined();
});

test('the line is one of the star’s honest lines, and the stage waits eight seconds for the code', () => {
  expect(STAR_WHY['no-code']).toBe(STAR_NO_CODE_TEXT);
  expect(STAR_NO_CODE_TEXT).toMatch(/^Still picture: \S/);
  expect(STAR_WAIT_MS).toBe(8000);
});
