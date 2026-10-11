'use client';
import {usePathname} from 'next/navigation';
import {useLayoutEffect,useRef} from 'react';
import {entranceAllowed} from './use-entrance';

/**
 * One calm arrival per page visit: a single light sweep across the page title, a short
 * staggered settle for the first visible cards and one shine on the key figures.
 * Paint only (background-position, opacity, transform); layout, copy and colours at rest
 * are unchanged. Nothing is marked under reduced motion or Motion Off, and each mark is
 * removed after its one pass, so re-renders never replay it.
 */
const WINDOW_MS = 900, MAX_CARDS = 8, MAX_METRICS = 3, SWEEP_PX_PER_S = 1500;
const CARD = 'section,article,aside,.panel';
// Elements that already have their own entrance keep it alone.
const OWN_ENTRANCE = '[data-entrance],.today-hero,.slogan-entrance,.hero-star,.nebula-flow';

/** Server-rendered nodes inside a Suspense boundary that has not hydrated yet must not gain attributes, or React reports a hydration mismatch. */
let pending = false;
function hydrated(el: Element) {
  const ok = Object.keys(el).some(key => key.startsWith('__reactFiber$'));
  if (!ok) pending = true;
  return ok;
}
function clear(el: HTMLElement) {
  delete el.dataset.arrive;
  for (const name of ['--arrive-i', '--arrive-base', '--arrive-size', '--arrive-repeat', '--arrive-duration', '--arrive-delay', '--arrive-pos']) el.style.removeProperty(name);
}
function mark(el: HTMLElement, mode: string, vars: Record<string, string> = {}) {
  if (el.dataset.arrive || !hydrated(el)) return;
  for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);
  el.dataset.arrive = mode;
  const done = (event?: AnimationEvent) => {
    if (event && event.target !== el) return;
    el.removeEventListener('animationend', done);
    el.removeEventListener('animationcancel', done);
    window.clearTimeout(timer);
    if (el.dataset.arrive === mode) clear(el);
  };
  el.addEventListener('animationend', done);
  el.addEventListener('animationcancel', done);
  // Safety net if the animation never runs (hidden element, Motion Off chosen mid-way).
  const timer = window.setTimeout(done, 2600);
}
/** Text drawn as a gradient (background-clip:text) gets a white shine over its own gradient; plain text gets a nebula tint. */
function sweep(el: HTMLElement, duration: number, delay: number) {
  const style = getComputedStyle(el);
  const timing = {'--arrive-duration': `${Math.round(duration)}ms`, '--arrive-delay': `${Math.round(delay)}ms`};
  if (style.backgroundClip === 'text' && style.backgroundImage !== 'none') {
    mark(el, 'shine', {...timing, '--arrive-base': style.backgroundImage, '--arrive-size': style.backgroundSize, '--arrive-repeat': style.backgroundRepeat, '--arrive-pos': style.backgroundPosition});
    return true;
  }
  const plain = style.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(style.backgroundColor) && style.textShadow === 'none' && style.webkitTextFillColor === style.color;
  if (!plain) return false;
  mark(el, 'tint', timing);
  return true;
}
function arriveTitle(title: HTMLElement) {
  if (title.closest(OWN_ENTRANCE) || title.querySelector('.nebula-flow') || title.dataset.arrive || !hydrated(title)) return;
  // Constant speed across the title box; gradient words inside it are timed to meet the same band.
  const box = title.getBoundingClientRect(), speed = SWEEP_PX_PER_S / 1000, start = 150;
  const duration = (1.5 * box.width) / speed;
  if (!sweep(title, duration, start)) return;
  for (const part of title.querySelectorAll<HTMLElement>('*')) {
    const style = getComputedStyle(part);
    if (style.backgroundClip !== 'text' || style.backgroundImage === 'none') continue;
    const r = part.getBoundingClientRect();
    sweep(part, (1.5 * r.width) / speed, start + (r.left - box.left - 0.25 * r.width + 0.25 * box.width) / speed);
  }
}
function numeric(el: Element) {
  const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  return own !== '' && /\d/.test(own) && /^[\d$€£¥,.\s%/+−-]+$/.test(own);
}
function arriveMetrics(main: HTMLElement) {
  let count = main.querySelectorAll('[data-arrive=shine][data-arrive-metric],[data-arrive=tint][data-arrive-metric]').length;
  for (const el of main.querySelectorAll<HTMLElement>('strong,span,p,b,output,dd')) {
    if (count >= MAX_METRICS) return;
    if (!numeric(el) || el.closest(OWN_ENTRANCE) || el.closest('h1')) continue;
    // Style before layout: most numbers are small, so their boxes are never measured.
    if (parseFloat(getComputedStyle(el).fontSize) < 30) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    // Gradient figures inherit a transparent fill; the shine goes on the element that paints the gradient.
    let target: HTMLElement | null = el;
    while (target && target !== main && getComputedStyle(target).webkitTextFillColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(target).backgroundImage === 'none') target = target.parentElement;
    if (!target || target === main || target.dataset.arrive) continue;
    const width = target.getBoundingClientRect().width;
    if (sweep(target, Math.max(700, (1.5 * width) / (SWEEP_PX_PER_S / 1000)), 420 + count * 110)) { target.dataset.arriveMetric = ''; count++; }
  }
}
function arriveCards(main: HTMLElement, roots: Iterable<Element>) {
  let index = main.querySelectorAll('[data-arrive=card]').length;
  const visit = (el: HTMLElement) => {
    if (index >= MAX_CARDS) return;
    const r = el.getBoundingClientRect();
    if (r.top >= innerHeight || r.height === 0) return;
    if (el.matches(OWN_ENTRANCE) || el.querySelector('h1') || el.closest('[data-arrive=card]')) {
      // Keep the title region steady (it has its own sweep); its later siblings can still settle.
      if (!el.matches(OWN_ENTRANCE) && el.querySelector('h1') && r.height > innerHeight * .6) for (const child of el.children) visit(child as HTMLElement);
      return;
    }
    if (el.matches(CARD) && r.height >= 60 && r.height <= innerHeight * 1.2) {
      if (el.dataset.arrive) return;
      mark(el, 'card', {'--arrive-i': String(index++)});
      return;
    }
    for (const child of el.children) visit(child as HTMLElement);
  };
  for (const root of roots) if (root instanceof HTMLElement && main.contains(root)) visit(root);
}

export function PageArrival() {
  const path = usePathname(), first = useRef(true);
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>('main');
    const initial = first.current;
    first.current = false;
    if (!main || !entranceAllowed()) return;
    const run = (added?: Iterable<Element>) => {
      const title = main.querySelector<HTMLElement>('h1');
      if (title) arriveTitle(title);
      // Cards already painted by the server on the first load stay put; only content that
      // arrives during this visit settles in, so nothing visible dims.
      if (added) arriveCards(main, added);
      else if (!initial) arriveCards(main, main.children);
      arriveMetrics(main);
    };
    pending = false;
    run();
    // Pages that load their records render them a moment later; watch those insertions briefly. React
    // commits arrive in several batches per frame, so they are read once per frame, not once per batch.
    // A title still waiting for its Suspense boundary to hydrate gets another look on the next frames.
    let frame = 0, retries = 0, added: Element[] | undefined;
    const flush = () => {
      frame = 0;
      const batch = added;
      added = undefined;
      pending = false;
      run(batch);
      if (pending && retries++ < 30) frame = requestAnimationFrame(flush);
    };
    if (pending) frame = requestAnimationFrame(flush);
    const observer = new MutationObserver(records => {
      (added ??= []).push(...records.flatMap(r => [...r.addedNodes].filter((n): n is Element => n instanceof Element)));
      if (!frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(main, {childList: true, subtree: true});
    const stop = window.setTimeout(() => { observer.disconnect(); cancelAnimationFrame(frame); }, WINDOW_MS);
    return () => { observer.disconnect(); window.clearTimeout(stop); cancelAnimationFrame(frame); };
  }, [path]);
  return null;
}
