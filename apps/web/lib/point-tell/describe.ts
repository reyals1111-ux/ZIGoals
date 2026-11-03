/**
 * Session AK Part 8.7 (ADR-036 A17), "Point and tell": what a note records about the part of the page the person tapped.
 * ONLY the element's role, one stable developer-made anchor (a `data-layout-item`, a `data-testid` or an `id`, from the
 * element or its nearest ancestor that has one), the route and the viewport size. NEVER visible text, an input's value,
 * an aria-label, a title, an href, a class or any other attribute value that may hold a person's data. An anchor value is
 * kept only when it reads like a developer's name; any part that looks like a record id is masked as `#`, and a value
 * that still does not read as a plain name is dropped.
 *
 * Pure: it reads through a DOM-like interface (tagName, getAttribute, parentElement), so it is tested with a stub.
 */
export type ElementLike = {readonly tagName: string; getAttribute(name: string): string | null; readonly parentElement: ElementLike | null};
export type AnchorKind = 'data-layout-item' | 'data-testid' | 'id';
export type Anchor = {kind: AnchorKind; value: string};
export type PointedElement = {role: string; anchor: Anchor | null};
export type Viewport = {width: number; height: number};

/** ARIA roles a tapped element may report (a role name is a fixed word, never personal data). */
export const ROLES = ['alert', 'alertdialog', 'article', 'banner', 'button', 'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'dialog', 'figure', 'form', 'generic', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'main', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation', 'option', 'paragraph', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'definition', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treeitem'] as const;
const ROLE_SET: ReadonlySet<string> = new Set(ROLES);
const INPUT_ROLES: Readonly<Record<string, string>> = {checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton', search: 'searchbox', button: 'button', submit: 'button', reset: 'button', image: 'button'};
const TAG_ROLES: Readonly<Record<string, string>> = {
  button: 'button', select: 'combobox', textarea: 'textbox', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  img: 'img', svg: 'img', nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo', aside: 'complementary', section: 'region',
  form: 'form', ul: 'list', ol: 'list', li: 'listitem', table: 'table', tr: 'row', td: 'cell', th: 'columnheader', dialog: 'dialog', p: 'paragraph',
  article: 'article', figure: 'figure', fieldset: 'group', details: 'group', summary: 'button', progress: 'progressbar', meter: 'meter', output: 'status', dl: 'list', dt: 'term', dd: 'definition', hr: 'separator', option: 'option',
};
/** How far up the tree an anchor is looked for. */
export const MAX_DEPTH = 16;
const MAX_ANCHOR = 80;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** The element's role: its own `role` when it is a known ARIA role word, else the role its tag implies, else "generic". */
export function roleOf(el: ElementLike): string {
  const explicit = (el.getAttribute('role') ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (ROLE_SET.has(explicit)) return explicit;
  const tag = el.tagName.toLowerCase();
  // An <a> is a link only with an href; the href itself is never read into the note.
  if (tag === 'a') return el.getAttribute('href') !== null ? 'link' : 'generic';
  if (tag === 'input') { const type = (el.getAttribute('type') ?? 'text').toLowerCase(); return INPUT_ROLES[type] ?? 'textbox'; }
  return TAG_ROLES[tag] ?? 'generic';
}

/**
 * A developer-made name, made safe: split on `- : _ .`, each part that looks like a record id (a digit run of 3 or more,
 * a hex run of 8 or more, a short hex run with a digit, a whole UUID, or longer than 24 characters) becomes `#`. Null when the value is not a plain name at all
 * (spaces, symbols, an `@`, a React generated id such as `«r1»`, `:r1:` or `_r_1_`).
 */
export function safeAnchorValue(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (!value || value.length > 200 || !/^[A-Za-z][A-Za-z0-9:_.-]*$/.test(value)) return null;
  const recordId = (part: string) => /\d{3,}|[0-9a-f]{8,}/i.test(part) || (/\d/.test(part) && /^[0-9a-f]{4,}$/i.test(part)) || part.length > 24;
  const parts = value.replace(UUID, '#').split(/([-:_.])/).map(part => /^[-:_.#]$/.test(part) || part === '' ? part : recordId(part) ? '#' : part);
  const masked = parts.join('').slice(0, MAX_ANCHOR);
  // Nothing but masks and separators says nothing; keep only a name with at least one plain word.
  return /[A-Za-z]{2,}/.test(masked.replace(/#/g, '')) ? masked : null;
}

/** The nearest stable anchor: on the element itself or an ancestor, a layout item first, then a test id, then an id. */
export function anchorOf(el: ElementLike | null): Anchor | null {
  let node = el;
  for (let depth = 0; node && depth < MAX_DEPTH; depth++, node = node.parentElement) {
    for (const kind of ['data-layout-item', 'data-testid', 'id'] as const) {
      const value = safeAnchorValue(node.getAttribute(kind));
      if (value) return {kind, value};
    }
  }
  return null;
}

/** The note's description of a tapped element: its role and its nearest anchor; nothing else is read. */
export function describeElement(el: ElementLike): PointedElement {
  return {role: roleOf(el), anchor: anchorOf(el)};
}

/**
 * The route without anything that may identify a record: the path only (no query, no hash), and each segment that is
 * not a plain lower-case word (an id, a number, an encoded name) becomes `:id`.
 */
export function normaliseRoute(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean).slice(0, 12).map(s => /^[a-z][a-z-]{0,40}$/.test(s) ? s : ':id');
  return `/${segments.join('/')}`;
}

/** The viewport in whole CSS pixels, within sane bounds (0 when unknown). */
export function viewportOf(width: number, height: number): Viewport {
  const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(20_000, Math.round(n))) : 0;
  return {width: clamp(width), height: clamp(height)};
}
