import type {PageArea} from '../settings';
import {attachesContext, pageArea, AREA_LABELS} from './pages';
import {cardName} from './card-help';

/**
 * Session AF (L4, P8.7): what the person is looking at, for "explain this card" and "what am I looking at". Only the
 * route and the cards' ids and titles, never a value: a title that carries a figure loses it ("Water · 1.2 L" is
 * "Water"). Nothing at all on Settings (the account, sync and recovery live there) or on a private screen; a Health card
 * only while the Health gate is open, otherwise one line says Health cards are not shared. Read from the page's own
 * markers — Today's modules (`data-module`), the For-you cards (`data-card`), a page's movable parts
 * (`data-layout-item`) and the sections with an id and a heading — and which of them are in view.
 */
export type PageCard = {id: string; label: string; inView: boolean; health: boolean};
export type PageView = {route: string; area: PageArea; page: string; cards: PageCard[]; healthHidden: number; focused: string | null};
export const MAX_PAGE_CARDS = 40, PAGE_VIEW_CHARS = 1500;
const HEALTH_WORDS = /health|water|weight|sleep|night|meditat|mindful|nutri|food|meal|kcal|calor|macro|protein|steps|activity|fast|diary|mood|measure|body|cycle|period/i;
/** A title without figures, symbols or long tails: what a card is, never what it shows. */
const FIGURE = /[-+−]?[$€£¥]?\d[\d.,:/%]*(?:\s*(?:l|ml|kg|lbs?|g|kcal|cal|steps?|mins?|minutes?|h|hrs?|hours?|days?|weeks?|months?|zig|stzig|usd|eur|usdc|km|mi|x|of|van|times?|keer|uur|dagen)\b)?/gi;
export function cleanLabel(text: string): string {
  let t = text.replace(FIGURE, ' ').replace(/[€$£¥%+−±=<>#*_~|()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) t = t.replace(/(?:^|\s*)[·•:,;–—-]+\s*$/, '').replace(/^\s*[·•:,;–—-]+\s*/, '').trim();
  return t.slice(0, 60).trim();
}
/**
 * A Health card by its id or its title. A widget's id from a Today preset carries the preset's name ("preset-habits-health-0"),
 * which says nothing about the widget, so that part is left out and its title decides ("Daily Habits" is shown, "Water
 * today" is not).
 */
export const isHealthCard = (id: string, label: string) => HEALTH_WORDS.test(id.replace(/preset-[a-z0-9-]*?-\d+$/i, 'preset')) || HEALTH_WORDS.test(label);
/** The page's own name for the route ("Today", "Wealth", "Earn", "Checklist"). */
export function pageName(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/app', seg = path.split('/')[2] ?? '';
  const names: Record<string, string> = {'': 'Today', earn: 'Earn', checklist: 'Checklist', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', portfolio: 'Portfolio', staking: 'Staking', markets: 'Markets', ecosystem: 'Ecosystem', activity: 'Activity', help: 'Help', journey: 'Journey', review: 'Life review', chess: 'Chess', governance: 'Governance', music: 'Music', timeline: 'Day Timeline', stories: 'Stories'};
  return names[seg] ?? AREA_LABELS[pageArea(path)];
}
type Found = {id: string; text: string; inView: boolean};
/** The page view from what was found on the page; pure, so the rules are tested without a browser. */
export function pageViewOf(pathname: string, found: readonly Found[], options: {healthOpen: boolean; sensitive: boolean; focused?: string | null}): PageView | null {
  if (options.sensitive || !attachesContext(pathname)) return null;
  const seen = new Set<string>(), cards: PageCard[] = [];
  let healthHidden = 0;
  for (const f of found) {
    if (!f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    const label = cardName(f.id) ?? (cleanLabel(f.text) || cleanLabel(f.id.replace(/^[#a-z-]*:/, '').replace(/[-_]/g, ' ')));
    if (!label) continue;
    // Gate C security review S3 (ADR-028 H133): on the Health page itself every card is Health's (a section shown only
    // because recent nights were short says something about them), so with the gate closed none is shared, whatever its
    // title; elsewhere a card is held back by its id or title.
    const health = pageArea((pathname.replace(/\/+$/, '') || '/app')) === 'health' || isHealthCard(f.id, label);
    if (health && !options.healthOpen) { healthHidden++; continue; }
    cards.push({id: f.id.slice(0, 80), label, inView: f.inView, health});
    if (cards.length >= MAX_PAGE_CARDS) break;
  }
  const route = (pathname.replace(/\/+$/, '') || '/app').slice(0, 120);
  const focused = options.focused && cards.some(c => c.id === options.focused) ? options.focused : null;
  return {route, area: pageArea(route), page: pageName(route), cards: [...cards.filter(c => c.inView), ...cards.filter(c => !c.inView)], healthHidden, focused};
}
/** The page view as the text an AI reads ("This page"), within 1,500 characters; ids and titles only. */
export function pageViewText(view: PageView): string {
  const line = (c: PageCard) => `${c.label} [${c.id}]`;
  const inView = view.cards.filter(c => c.inView), below = view.cards.filter(c => !c.inView);
  const parts = [`## On screen (card titles and ids only; no values)`, `Page: ${view.page} (${view.route})`,
    ...(view.focused ? [`The card asked about: ${line(view.cards.find(c => c.id === view.focused)!)}`] : []),
    inView.length ? `In view: ${inView.map(line).join('; ')}` : 'In view: no card',
    ...(below.length ? [`Further on the page: ${below.map(line).join('; ')}`] : []),
    ...(view.healthHidden ? [`Health cards: ${view.healthHidden} not shared with ZIGi`] : [])];
  const text = parts.join('\n');
  return text.length <= PAGE_VIEW_CHARS ? text : `${text.slice(0, PAGE_VIEW_CHARS - 1)}…`;
}
/** The card a phrase names on this page ("the funding rhythm card", "deze kaart" with one card in focus), or null. */
export function cardOnPage(view: PageView, phrase: string): PageCard | null {
  const key = phrase.toLowerCase().replace(/\b(?:the|my|this|that|card|widget|section|part|de|het|deze|die|kaart|blok)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!key) return view.focused ? view.cards.find(c => c.id === view.focused) ?? null : view.cards.filter(c => c.inView).length === 1 ? view.cards.find(c => c.inView)! : null;
  const exact = view.cards.filter(c => c.label.toLowerCase() === key);
  if (exact.length === 1) return exact[0]!;
  const partial = view.cards.filter(c => c.label.toLowerCase().includes(key) || key.includes(c.label.toLowerCase()));
  return partial.length === 1 ? partial[0]! : null;
}

// ---- The browser side: read the page's markers (the chat chunk calls it; nothing here runs on the server) ----
// The page's own markers, then the parts a page names (a section with an id, a named region such as Today's "Checklist").
// A named part inside a marked card is that card's own content and is not listed again.
const MARKERS = '[data-module], [data-card], [data-layout-item]';
const SELECTORS = `${MARKERS}, main section[id], main article[id], main section[aria-label], main section[aria-labelledby], main [role="region"][aria-label], main [role="region"][aria-labelledby]`;
let lastCard: string | null = null, tracking = false;
const textOf = (el: Element): string => {
  const own = el.getAttribute('aria-label'); if (own) return own;
  const by = el.getAttribute('aria-labelledby'); const named = by ? el.ownerDocument.getElementById(by.split(/\s+/)[0]!)?.textContent : null; if (named) return named;
  return el.querySelector('h1, h2, h3, h4, [role="heading"]')?.textContent ?? '';
};
/** A named region's id from its title without figures ("Today’s focus" is `region:today-s-focus`). */
const regionId = (el: Element): string | null => { const slug = cleanLabel(textOf(el)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); return slug ? `region:${slug}` : null; };
const idOf = (el: Element): string | null => {
  const m = el.getAttribute('data-module'); if (m) return `${el.getAttribute('data-kind') === 'widget' ? 'widget' : 'today'}:${m}`;
  const c = el.getAttribute('data-card'); if (c) return `card:${c}`;
  const l = el.getAttribute('data-layout-item'); if (l) return l;
  if (el.id) return `#${el.id}`;
  return regionId(el);
};
/**
 * Listed on its own: a marked card always; a section with an id unless it sits inside a marked card (the card's own
 * content, listed once); a named region only outside every other part, and never the page's own head (its h1).
 */
const listed = (el: Element): boolean => {
  if (el.matches(MARKERS)) return true;
  if (el.id) return !el.parentElement?.closest(MARKERS);
  return !el.parentElement?.closest(SELECTORS) && !el.querySelector('h1');
};
/** Remembers the last card the person pointed at or focused (for "explain this card"); installed once, passive. */
export function trackCardFocus(doc: Document = document): void {
  if (tracking) return; tracking = true;
  const note = (event: Event) => {
    let el = event.target instanceof Element ? event.target.closest(SELECTORS) : null;
    while (el && !listed(el)) el = el.parentElement?.closest(SELECTORS) ?? null; // the card it belongs to, as the page view lists it
    const id = el ? idOf(el) : null; if (id) lastCard = id;
  };
  doc.addEventListener('pointerdown', note, {capture: true, passive: true}); doc.addEventListener('focusin', note, {capture: true});
}
export function readPageView(doc: Document, pathname: string, options: {healthOpen: boolean; sensitive: boolean}): PageView | null {
  if (options.sensitive || !attachesContext(pathname)) return null;
  const height = doc.defaultView?.innerHeight ?? 800, width = doc.defaultView?.innerWidth ?? 1200;
  const found: Found[] = [];
  for (const el of Array.from(doc.querySelectorAll(SELECTORS))) {
    if (el.closest('dialog, [data-ai-dialog], .ai-chat, [aria-hidden="true"], [hidden]') || !listed(el)) continue;
    const id = idOf(el); if (!id) continue;
    const rect = el.getBoundingClientRect(), shown = rect.width > 0 && rect.height > 0;
    if (!shown) continue;
    found.push({id, text: textOf(el), inView: rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width});
    if (found.length > 120) break;
  }
  return pageViewOf(pathname, found, {...options, focused: lastCard});
}
