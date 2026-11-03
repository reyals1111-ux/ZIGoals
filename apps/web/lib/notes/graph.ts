import {outgoing, type LinkIndex, type LinkKind} from './links';
import type {Note} from './schema';

/**
 * Session AK (B3): the notes graph as a star system — pure maths, no dependency. The most linked name is the star at the
 * centre; what links to it or from it orbits on the first ring (planets), what links to those on the second (moons),
 * and so on; names with no path to the star sit on the outer belt. Each ring's bodies are spaced evenly, every ring
 * turned by the golden angle so neighbours never line up; a body's size grows with its links. Deterministic: the same
 * notes always draw the same sky. Goals and habits appear only once a note links to them.
 */
export type GraphNode = {key: string; kind: LinkKind; id: string; name: string; href: string; degree: number};
export type GraphEdge = {from: string; to: string};
export type Graph = {nodes: GraphNode[]; edges: GraphEdge[]};
export type PlacedNode = GraphNode & {x: number; y: number; r: number; ring: number};
export type Layout = {nodes: PlacedNode[]; edges: GraphEdge[]; rings: number[]; size: number; centre: number; cut: number};
export const MAX_DRAWN = 300, MAX_RINGS = 3;
const keyOf = (kind: LinkKind, id: string) => `${kind}:${id}`;

/** Every non-inbox note and every goal or habit a note links to, with one edge per linked pair. */
export function buildGraph(notes: readonly Note[], index: LinkIndex): Graph {
  const nodes = new Map<string, GraphNode>(), edges = new Map<string, GraphEdge>();
  const put = (kind: LinkKind, id: string, name: string, href: string) => { const key = keyOf(kind, id); if (!nodes.has(key)) nodes.set(key, {key, kind, id, name, href, degree: 0}); return key; };
  const own = new Map(index.all.filter(t => t.kind === 'note').map(t => [t.id, t]));
  for (const n of notes) { const t = own.get(n.id); if (t) put('note', n.id, t.name, t.href); }
  for (const n of notes) {
    const from = own.get(n.id);
    if (!from) continue;
    for (const t of outgoing(n, index).targets) {
      const a = keyOf('note', n.id), b = put(t.kind, t.id, t.name, t.href);
      if (a === b) continue;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!edges.has(k)) { edges.set(k, {from: a, to: b}); nodes.get(a)!.degree++; nodes.get(b)!.degree++; }
    }
  }
  return {nodes: [...nodes.values()], edges: [...edges.values()]};
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const byWeight = (a: GraphNode, b: GraphNode) => b.degree - a.degree || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) || a.key.localeCompare(b.key);
/** A body's radius: 6 for a lone note, growing with its links up to 18; the star is larger. */
export const bodyRadius = (degree: number, star = false) => star ? 24 : Math.min(18, 6 + 2.4 * Math.sqrt(degree));
/** Places the graph in a square of `size` (most linked first; at most 300 drawn, the rest counted in `cut`). */
export function layoutStarSystem(graph: Graph, size = 640): Layout {
  const centre = size / 2, sorted = [...graph.nodes].sort(byWeight), drawn = sorted.slice(0, MAX_DRAWN), keep = new Set(drawn.map(n => n.key));
  const edges = graph.edges.filter(e => keep.has(e.from) && keep.has(e.to));
  if (!drawn.length) return {nodes: [], edges: [], rings: [], size, centre, cut: 0};
  const near = new Map<string, string[]>(drawn.map(n => [n.key, []]));
  for (const e of edges) { near.get(e.from)!.push(e.to); near.get(e.to)!.push(e.from); }
  // Distance from the star (breadth first); beyond the last ring, or out of reach, is the outer belt.
  const star = drawn[0]!, ring = new Map<string, number>([[star.key, 0]]), queue = [star.key];
  while (queue.length) { const k = queue.shift()!, d = ring.get(k)!; for (const m of near.get(k)!) if (!ring.has(m)) { ring.set(m, Math.min(d + 1, MAX_RINGS)); queue.push(m); } }
  const belt = MAX_RINGS + 1, used = Math.max(1, ...drawn.map(n => ring.get(n.key) ?? belt));
  const margin = 28, step = (centre - margin) / used, rings = Array.from({length: used}, (_, i) => step * (i + 1));
  const groups = new Map<number, GraphNode[]>();
  for (const n of drawn.slice(1)) { const r = Math.min(ring.get(n.key) ?? belt, used); groups.set(r, [...(groups.get(r) ?? []), n]); }
  const placed: PlacedNode[] = [{...star, x: centre, y: centre, r: bodyRadius(star.degree, true), ring: 0}];
  for (const [r, list] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const radius = rings[r - 1]!, turn = GOLDEN * r;
    list.forEach((n, i) => { const a = turn + (2 * Math.PI * i) / list.length; placed.push({...n, x: round(centre + radius * Math.cos(a)), y: round(centre + radius * Math.sin(a)), r: bodyRadius(n.degree), ring: r}); });
  }
  return {nodes: placed, edges, rings, size, centre, cut: graph.nodes.length - drawn.length};
}
const round = (n: number) => Math.round(n * 10) / 10;
/** The names a body is linked with (for its label and the list view). */
export function neighbours(graph: Pick<Graph, 'nodes' | 'edges'>, key: string): GraphNode[] {
  const byKey = new Map(graph.nodes.map(n => [n.key, n]));
  return graph.edges.flatMap(e => e.from === key ? [byKey.get(e.to)] : e.to === key ? [byKey.get(e.from)] : []).filter((n): n is GraphNode => !!n).sort(byWeight);
}
