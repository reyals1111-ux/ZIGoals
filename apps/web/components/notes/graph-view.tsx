'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useId, useMemo, useState, useSyncExternalStore} from 'react';
import type {Note} from '../../lib/notes/schema';
import {buildGraph, layoutStarSystem, neighbours, type GraphNode} from '../../lib/notes/graph';
import type {LinkIndex} from '../../lib/notes/links';

/**
 * Session AK (B3): the notes graph in the star-system style — hand-made SVG, no library. The most linked name is the
 * star, linked names orbit as planets on faint rings, and links are drawn as light paths between them. Every body is a
 * real link, reached with Tab (in ring order) and opened with Enter; focusing or hovering one lights its links and names
 * them. The rings turn very slowly as decoration only, never under reduced motion or Motion Off — and then the list opens
 * first. The list view shows the same graph as text: each name, what it is, and what it links with.
 */
const KIND = {note: 'Note', goal: 'Goal', habit: 'Habit'} as const;
function motionOff(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.dataset.appMotion === 'off' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
const subscribe = (cb: () => void) => { const m = window.matchMedia?.('(prefers-reduced-motion: reduce)'); m?.addEventListener?.('change', cb); return () => m?.removeEventListener?.('change', cb); };
export default function GraphView({notes, index}: {notes: readonly Note[]; index: LinkIndex}) {
  const router = useRouter(), base = useId();
  const still = useSyncExternalStore(subscribe, motionOff, () => false);
  const [chosen, setChosen] = useState<'sky' | 'list' | null>(null), view = chosen ?? (still ? 'list' : 'sky');
  const [lit, setLit] = useState<string | null>(null);
  const graph = useMemo(() => buildGraph(notes, index), [notes, index]);
  const layout = useMemo(() => layoutStarSystem(graph, 640), [graph]);
  const byKey = useMemo(() => new Map(layout.nodes.map(n => [n.key, n])), [layout]);
  const litNear = useMemo(() => lit ? new Set(neighbours(graph, lit).map(n => n.key)) : null, [graph, lit]);
  const linked = graph.edges.length;
  if (!graph.nodes.length) return <div className="note-graph-empty"><p>No notes to draw yet.</p><p className="fine">Write a note and link it with <code>[[</code> to a goal, a habit or another note: each link becomes an orbit here.</p></div>;
  const listed = [...graph.nodes].sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name));
  const label = (n: GraphNode) => `${KIND[n.kind]}: ${n.name}, ${n.degree} ${n.degree === 1 ? 'link' : 'links'}`;
  return <div className="note-graph">
    <div className="note-graph-head">
      <p className="fine">{graph.nodes.length} {graph.nodes.length === 1 ? 'name' : 'names'} · {linked} {linked === 1 ? 'link' : 'links'}{layout.cut ? ` · the ${layout.cut} least linked are in the list only` : ''}</p>
      <div className="note-graph-switch" role="group" aria-label="Show the graph as">
        <button type="button" className={view === 'sky' ? 'secondary' : 'quiet'} aria-pressed={view === 'sky'} onClick={() => setChosen('sky')}>Star system</button>
        <button type="button" className={view === 'list' ? 'secondary' : 'quiet'} aria-pressed={view === 'list'} onClick={() => setChosen('list')}>List</button>
      </div>
    </div>
    {view === 'sky' ? <figure className="note-graph-sky" data-still={still ? '' : undefined}>
      <svg viewBox={`0 0 ${layout.size} ${layout.size}`} role="group" aria-labelledby={`${base}-cap`} className="note-graph-svg">
        <defs>
          <radialGradient id={`${base}-star`}><stop offset="0" stopColor="var(--text-strong, #fff)"/><stop offset=".45" stopColor="var(--brand-cyan, #63e7ff)"/><stop offset="1" stopColor="var(--brand-violet, #826cff)" stopOpacity=".2"/></radialGradient>
        </defs>
        <g aria-hidden="true">{layout.rings.map((r, i) => <circle key={r} className="note-orbit" data-ring={i + 1} cx={layout.centre} cy={layout.centre} r={r}/>)}</g>
        <g aria-hidden="true">{layout.edges.map(e => { const a = byKey.get(e.from)!, b = byKey.get(e.to)!; const on = lit && (e.from === lit || e.to === lit); return <line key={`${e.from}|${e.to}`} className={`note-edge${on ? ' is-lit' : lit ? ' is-dim' : ''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>; })}</g>
        {layout.nodes.map(n => {
          const dim = lit && lit !== n.key && !litNear?.has(n.key);
          return <a key={n.key} href={n.href} className={`note-body is-${n.kind}${n.ring === 0 ? ' is-star' : ''}${dim ? ' is-dim' : ''}`} aria-label={label(n)}
            onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); router.push(n.href); }}
            onFocus={() => setLit(n.key)} onBlur={() => setLit(null)} onPointerEnter={() => setLit(n.key)} onPointerLeave={() => setLit(null)}>
            <circle className="note-body-hit" cx={n.x} cy={n.y} r={Math.max(22, n.r + 6)}/>
            <circle className="note-body-dot" cx={n.x} cy={n.y} r={n.r} fill={n.ring === 0 ? `url(#${base}-star)` : undefined}/>
            {(n.ring <= 1 || lit === n.key || litNear?.has(n.key)) && <text className="note-body-label" x={n.x} y={n.y + n.r + 14} textAnchor="middle">{n.name.length > 22 ? `${n.name.slice(0, 21)}…` : n.name}</text>}
          </a>;
        })}
      </svg>
      <figcaption id={`${base}-cap`} className="fine">Your notes as a star system: the most linked name at the centre, linked names on the rings. Tab to a body to light its links; Enter opens it. <span className="note-key is-note">Note</span> <span className="note-key is-goal">Goal</span> <span className="note-key is-habit">Habit</span></figcaption>
    </figure> : <ul className="note-graph-list" aria-label="Notes, goals and habits and their links">
      {listed.map(n => { const near = neighbours(graph, n.key); return <li key={n.key}>
        <Link href={n.href} className={`note-graph-name is-${n.kind}`}>{n.name}</Link> <span className="fine">· {KIND[n.kind]}{n.degree ? ` · ${n.degree} ${n.degree === 1 ? 'link' : 'links'}` : ' · no links yet'}</span>
        {near.length > 0 && <p className="fine note-graph-near">Linked with: {near.map((m, i) => <span key={m.key}>{i > 0 && ', '}<Link className="text-link" href={m.href}>{m.name}</Link></span>)}</p>}
      </li>; })}
    </ul>}
  </div>;
}
