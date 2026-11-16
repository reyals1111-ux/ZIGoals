'use client';
import {Children, createContext, createElement, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {fitWholeRows, moreWords, rowShown} from '../../../lib/nova/cards/whole-rows';
import './whole-rows.css';

/**
 * Session AM-2 (whole rows only). A list inside a widget shows exactly the rows that fit in the height its panel leaves,
 * and under them one last line, "+N more" (N = the rows not shown), which itself always fits. A row is never cut by the
 * panel's edge.
 *
 * How it knows. A Holo panel on a computer has a fixed height and its body is the box that clips (`.nova-widget-body`,
 * holo/holo.css). The list is measured there, on the real layout: every row is shown; if the body (or a box marked
 * `data-wr-limit` between the list and the body: a column or a grid cell with a height of its own) then holds more than
 * its height, rows leave one at a time from the end (lib/nova/cards/whole-rows.ts) until nothing runs past any of those
 * boxes. If something else in the panel is too tall by itself, each box's overflow is compared with its overflow with no
 * row at all, so only the rows are ever blamed. The measure reads layout sizes (scrollHeight, clientHeight), never screen
 * rectangles: a tilted wing or a widget that is still arriving (a transform) reads the same. Nothing is estimated, so the
 * result cannot be off by a few pixels.
 *
 * When it measures. Before the first paint (a layout effect, once), after a later render at the next animation frame
 * (round 6, below), when the body's box changes (a
 * ResizeObserver on the body alone: its size never depends on the rows, so there is no loop), when anything inside the
 * body changes (a MutationObserver: a row's words, a status line, an error under a field), and once the fonts are in. It
 * writes to the page only what changed, and tells React only when a count changed.
 *
 * What a measure costs, and when it is skipped (Session AM-2, regressions). A measure shows every row and then takes rows
 * away one at a time, and the browser lays the panel out again for each step. NOVA's dashboard renders once a second (its
 * clock) and many times while it opens, and every list measured after each of those renders: with the Showcase's ten
 * panels that was about 3 s of the first 6 s and 0.2 s of every second after, on the processor that also draws the page
 * (the opening ended late, lazy parts and answers arrived seconds late). So the fitter keeps what its last measure read
 * (the same lists, the same row elements, each box's size and overflow, each list's own size) and its answer: a render or
 * a resize that changed none of it reads those few numbers and leaves the page alone. A change of content (the
 * MutationObserver) and the fonts always measure. The fit's own writes (`hidden`, the last line's words) are not content,
 * nor is an attribute written again with the value it had. (Measured on the Showcase at 1440 x 900: the browser lays the
 * whole page out for each step, about 40 ms on a processor-drawn page, so the steps a real change still takes are the
 * cost that is left: about 25 steps while NOVA opens.)
 *
 * Round 6 (AM-3): the check after a render waits for the next animation frame. Even a check that changes nothing must
 * read the layout, and a read straight after a render makes the browser lay the page out there and then: while the
 * Showcase's stage opened that was twelve layouts of about 50 ms each, outside any frame (the opening ended after the
 * 5 s its spec allows). At the frame the browser lays the page out anyway, so the read costs nothing more, every list
 * shares that one layout, and the frame is still painted with whole rows only. A change of content (the
 * MutationObserver) is still answered at once, before the paint. Without frames (a test without layout) it stays at once.
 *
 * Where there is no height to fit (a phone, the band below the fold, a narrow stage, the Classic cards, a test without
 * layout) every row is shown. Rows that are not shown carry `hidden`: they are out of the accessibility tree and cannot
 * take the focus. Nothing here animates. A widget's table for assistive technology keeps every row.
 *
 * `WholeRowsGroup` joins the lists of one widget: they are fitted together, the first list first (the last gives its rows
 * up first, and gets back the ones that turn out to fit: lists side by side do not share their height).
 */
type Member = {
  wrap: HTMLElement; list: HTMLElement; more: HTMLElement; min: number; keep: 'first' | 'last'; extra: number; collapse: boolean;
  report: (hidden: number, shown: number, line: boolean) => void;
};
type Fitter = {members: Set<Member>;
  /** The check after a render: one measure at the next animation frame, however many renders ask (at once where there are no frames). */
  soon: () => void;
  /** Fits the rows. Unless `force` is set, nothing is read twice or written when nothing the last measure read has changed. */
  measure: (force?: boolean) => void;
  /**
   * Whether a change in the page is no change of content: the fit's own writing (a row's, the line's or the box's `hidden`,
   * the box's short mark, the last line's words), or an attribute written again with the value it had (React writes a
   * field's `name` and `type` again on every render).
   */
  own: (record: MutationRecord) => boolean};
/** What a measure read and answered: while none of it has changed, the answer stands. */
type Fitted = {lists: readonly Member[]; rows: readonly (readonly HTMLElement[])[]; boxes: readonly HTMLElement[]; sizes: readonly number[]};
const sameItems = <T,>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** The numbers a fit depends on, read from the layout as it stands: each box's size and what runs past it, each list's own size. */
const sizesOf = (boxes: readonly HTMLElement[], lists: readonly Member[]) => [...boxes.flatMap(b => [b.clientHeight, b.clientWidth, b.scrollHeight]), ...lists.flatMap(m => [m.wrap.offsetHeight, m.wrap.offsetWidth])];
const BODY = '.nova-widget[data-holo] .nova-widget-body';
const setHidden = (el: HTMLElement, hidden: boolean) => { if (el.hidden !== hidden) el.hidden = hidden; };
const rowsOf = (list: HTMLElement) => Array.from(list.children).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute('data-wr-keep'));
const over = (el: HTMLElement) => el.scrollHeight - el.clientHeight;

function createFitter(): Fitter {
  const members = new Set<Member>();
  let busy = false, fitted: Fitted | null = null;
  const measure = (force = false) => {
    if (busy) return;
    const lists = [...members].filter(m => m.wrap.isConnected).sort((a, b) => a.wrap.compareDocumentPosition(b.wrap) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const first = lists[0];
    if (!first) { fitted = null; return; }
    busy = true;
    try {
      const rows = lists.map(m => rowsOf(m.list)), all = rows.map(r => r.length);
      const body = first.wrap.closest<HTMLElement>(BODY), fit = !!body && body.clientHeight > 0, boxes = new Set<HTMLElement>(fit ? [body] : []);
      if (fit) for (const m of lists) for (let el: HTMLElement | null = m.wrap; el && el !== body; el = el.parentElement) if (el.hasAttribute('data-wr-limit')) boxes.add(el);
      // Nothing the last measure read has changed (the same lists and rows, in the same boxes, of the same sizes): its answer stands.
      if (!force && fitted && sameItems(fitted.lists, lists) && sameItems(fitted.boxes, [...boxes]) && fitted.rows.length === rows.length && fitted.rows.every((r, i) => sameItems(r, rows[i]!)) && sameItems(fitted.sizes, sizesOf([...boxes], lists))) return;
      // `bare`: no "+N more" line at all (the measure's base, and the last resort below).
      const apply = (shown: readonly number[], bare = false) => lists.forEach((m, i) => {
        const n = all[i]!, k = shown[i]!;
        rows[i]!.forEach((el, r) => setHidden(el, !rowShown(r, n, k, m.keep)));
        setHidden(m.more, bare || n - k + m.extra <= 0);
        setHidden(m.wrap, m.collapse && k === 0 && n > 0);
      });
      let shown = all, line = true;
      // No fitted panel around the list, or no layout to read (a hidden panel, a test): every row.
      if (fit) {
        apply(all);
        if ([...boxes].some(b => over(b) > 0)) {
          // Rows leave from the end, so a row of a single list that stays is never hidden and shown again on the way (it
          // would start its one arrival animation again while its widget is being made).
          const base = new Map<HTMLElement, number>([...boxes].map(b => [b, 0])), fits = () => [...boxes].every(b => over(b) <= base.get(b)!);
          const specs = lists.map((m, i) => ({rows: all[i]!, min: m.min})), search = () => fitWholeRows(specs, counts => { apply(counts); return fits(); });
          shown = search();
          apply(shown);
          if (!fits()) {
            // Still too tall at every list's minimum. What runs past a box with no row at all is not the rows' doing:
            // measure that, and fit again against it (only the rows are ever blamed).
            apply(all.map(() => 0), true);
            let own = false;
            for (const b of boxes) { const o = Math.max(0, over(b)); base.set(b, o); own ||= o > 0; }
            if (own) shown = search();
            apply(shown);
            // And if the rows at their minimum and the line still do not fit: the rows stay whole and the line gives way (never a cut line).
            if (!fits()) { apply(shown, true); line = !fits(); }
          }
        }
      }
      apply(shown, !line);
      fitted = {lists, rows, boxes: [...boxes], sizes: sizesOf([...boxes], lists)};
      lists.forEach((m, i) => m.report(all[i]! - shown[i]! + m.extra, shown[i]!, line));
    } finally { busy = false; }
  };
  const own = (record: MutationRecord) => {
    const at = record.target, mark = record.type === 'attributes' && (record.attributeName === 'hidden' || record.attributeName === 'data-wr-short');
    if (record.type === 'attributes' && record.attributeName && at instanceof Element && at.getAttribute(record.attributeName) === record.oldValue) return true;
    for (const m of members) if (m.more.contains(at) || (mark && (at === m.wrap || at === m.list || at.parentNode === m.list))) return true;
    return false;
  };
  let frame = 0;
  const soon = () => {
    if (typeof requestAnimationFrame !== 'function') return measure();
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
  };
  return {members, measure, soon, own};
}

const GroupContext = createContext<Fitter | null>(null);
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Measure before the first paint, check again at the frame after every later render, and measure whenever the panel's body changes size or content. `anchor` is any element inside the
 * widget. A fitted body is a size container (its size cannot depend on its rows), so a resize is answered at once, before
 * the paint; a body as tall as its content (a panel moving to the band) is answered at the next frame instead, because
 * showing its rows again changes the very box that was observed (a ResizeObserver must not do that inside its callback).
 */
function useFitting(fitter: Fitter, anchor: {current: HTMLElement | null}, on: boolean) {
  // The first measure, before the first paint; a later render asks for a check at the next frame (see "Round 6" above).
  const mounted = useRef(false);
  useIsoLayoutEffect(() => { if (on) { mounted.current = true; fitter.measure(); } else mounted.current = false; }, [fitter, on]);
  const rendered = useRef(false);
  useIsoLayoutEffect(() => {
    if (!on || !mounted.current) return;
    if (!rendered.current) { rendered.current = true; return; } // the mount's own render was measured above
    fitter.soon();
  });
  useEffect(() => {
    const body = on ? anchor.current?.closest<HTMLElement>(BODY) : null;
    if (!body) return;
    let live = true, frame = 0;
    const again = () => { if (live) fitter.measure(); };
    // A change of content always measures: a row's words or state can change its height with no box changing its size.
    const changed = (records: MutationRecord[]) => { if (live && !records.every(fitter.own)) fitter.measure(true); };
    const resized = () => {
      if (getComputedStyle(body).containerType === 'size') return again();
      cancelAnimationFrame(frame); frame = requestAnimationFrame(again);
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resized);
    const change = typeof MutationObserver === 'undefined' ? null : new MutationObserver(changed);
    resize?.observe(body);
    change?.observe(body, {childList: true, subtree: true, characterData: true, attributes: true, attributeOldValue: true});
    void document.fonts?.ready.then(() => { if (live) fitter.measure(true); });
    return () => { live = false; cancelAnimationFrame(frame); resize?.disconnect(); change?.disconnect(); };
  }, [fitter, anchor, on]);
}

/** The lists of one widget, fitted together: the first list keeps its rows longest. Renders one box (`className`) around them. */
export function WholeRowsGroup({className, limit = false, children}: {className?: string; /** This box has a height of its own (a column, a grid cell): its lists never run past it. */ limit?: boolean; children: ReactNode}) {
  const [fitter] = useState(createFitter), box = useRef<HTMLDivElement>(null);
  useFitting(fitter, box, true);
  return <GroupContext.Provider value={fitter}><div ref={box} className={className} data-wr-limit={limit ? '' : undefined}>{children}</div></GroupContext.Provider>;
}

export type WholeRowsProps = {
  /** The list's element (its rows are its element children; a child marked `data-wr-keep` is not a row: a header). */
  as?: 'ul' | 'ol' | 'div' | 'dl';
  /** The list's own class and name. */
  className?: string; 'aria-label'?: string; 'aria-hidden'?: boolean; style?: CSSProperties;
  /** The class of the box around the list and its last line (the box takes the list's place in the widget's layout). */
  wrapClassName?: string;
  /** Rendered above the list, inside the box (a heading that leaves with the list when `collapse` is set). */
  head?: ReactNode;
  /** The last line's words for `hidden` rows not shown (and `shown` rows shown). Default: "+N more". */
  more?: (hidden: number, shown: number) => string;
  /** Rows the widget holds beyond the ones it rendered here: they count in "+N more". */
  extra?: number;
  /** Never fewer rows than this (default 0: the last line alone may stand for the list). */
  min?: number;
  /** Which rows stay when some must go: the first ones (default), or the last ones (a calendar's latest weeks). */
  keep?: 'first' | 'last';
  /** With no room for a single row, the whole box leaves (heading and last line too). */
  collapse?: boolean;
  /** How many rows a server render and the very first render show (the size's default); the rest join before the first paint. */
  initial?: number;
  /** The box has a height of its own (a column, a grid cell): the rows never run past it. */
  limit?: boolean;
  /**
   * No box around the list: the list keeps its own place among its siblings (a sheet that styles it as a direct child
   * still does) and the last line is the list's own last child (an `li` in a `ul` or `ol`). `head` is then rendered as
   * the list's first child and must carry `data-wr-keep`.
   */
  inline?: boolean;
  children: ReactNode;
};
export function WholeRows({as = 'ul', className = '', wrapClassName = '', head, more, extra = 0, min = 0, keep = 'first', collapse = false, initial, limit = false, inline = false, children, ...list}: WholeRowsProps) {
  const group = useContext(GroupContext), [own] = useState(createFitter), fitter = group ?? own;
  const wrap = useRef<HTMLElement | null>(null), listEl = useRef<HTMLElement | null>(null), moreEl = useRef<HTMLElement | null>(null);
  const [{setWrap, setList, setMore, setBoth}] = useState(() => ({
    setWrap: (el: HTMLElement | null) => { wrap.current = el; }, setList: (el: HTMLElement | null) => { listEl.current = el; }, setMore: (el: HTMLElement | null) => { moreEl.current = el; },
    setBoth: (el: HTMLElement | null) => { wrap.current = el; listEl.current = el; },
  }));
  const all = Children.toArray(children), [live, setLive] = useState(initial === undefined);
  const first = live ? all.length : Math.min(all.length, Math.max(0, initial ?? all.length));
  const [fit, setFit] = useState<{hidden: number; shown: number; line: boolean} | null>(null);
  // Before the first measure: the rows rendered, and what the widget holds beyond them.
  const state = fit ?? {hidden: all.length - first + extra, shown: first, line: true};
  useIsoLayoutEffect(() => {
    if (!wrap.current || !listEl.current || !moreEl.current) return;
    const m: Member = {wrap: wrap.current, list: listEl.current, more: moreEl.current, min, keep, extra, collapse,
      report: (hidden, shown, line) => setFit(was => was && was.hidden === hidden && was.shown === shown && was.line === line ? was : {hidden, shown, line})};
    fitter.members.add(m);
    return () => { fitter.members.delete(m); };
  }, [fitter, min, keep, extra, collapse]);
  useIsoLayoutEffect(() => { if (!live) setLive(true); }, [live]);
  // A list in a group is measured by its group (after every list of the group has rendered), and once more when its own
  // rows have all joined.
  useFitting(fitter, wrap, !group && live);
  useIsoLayoutEffect(() => { if (group && live) group.measure(); }, [group, live]);
  const words = state.hidden > 0 ? (more ?? ((hidden, shown) => moreWords(hidden, {shown})))(state.hidden, state.shown) : '';
  const gone = collapse && state.shown === 0 && all.length > 0 ? true : undefined, short = state.hidden > extra ? '' : undefined;
  const rows = live ? all : all.slice(0, first);
  const line = {ref: setMore, className: 'wr-more', hidden: state.hidden > 0 && state.line ? undefined : true};
  if (inline) return createElement(as, {...list, ref: setBoth, className: `wr-list wr-inline ${className}`.trim(), 'data-wr-limit': limit ? '' : undefined, 'data-wr-short': short, hidden: gone},
    head, rows, createElement(as === 'ul' || as === 'ol' ? 'li' : as === 'dl' ? 'div' : 'p', {...line, 'data-wr-keep': ''}, words));
  return <div ref={setWrap} className={`wr ${wrapClassName}`.trim()} data-wr-limit={limit ? '' : undefined} data-wr-short={short} hidden={gone}>
    {head}
    {createElement(as, {...list, ref: setList, className: `wr-list ${className}`.trim()}, rows)}
    {createElement('p', line, words)}
  </div>;
}
