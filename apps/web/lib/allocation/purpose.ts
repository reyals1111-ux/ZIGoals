/**
 * Session AK (7.5): where each asset's value is meant to go — the purpose allocation — as flows, one currency at a time
 * (never converted). From lib/positions.ts allocations: an asset's units promised to an open Goal are worth that share
 * of its known value (when promises pass what is held, each is scaled down as goalProgress does); what is left is
 * "Still available". An asset without a known value has no flow and is listed apart (unknown is not zero). Pure.
 */
export type PurposeAsset = {positionId: string; label: string; wealthClass: string; currency?: string; value?: bigint; quantity: string};
export type PurposeInput = {
  assets: readonly PurposeAsset[];
  goals: readonly {id: string; name: string; status: string}[];
  allocations: readonly {goalId: string; positionId: string; quantity: string}[];
};
export type FlowNode = {id: string; label: string; value: bigint; kind: 'asset' | 'goal' | 'available'; wealthClass?: string};
export type Flow = {from: string; to: string; value: bigint};
export type PurposeView = {currency: string; assets: FlowNode[]; targets: FlowNode[]; flows: Flow[]; total: bigint};
export const AVAILABLE = 'still-available';
export function purposeFlows(input: PurposeInput): {views: PurposeView[]; unvalued: {positionId: string; label: string}[]} {
  const open = new Map(input.goals.filter(g => g.status !== 'closed').map(g => [g.id, g.name]));
  const byCurrency = new Map<string, PurposeView>(), unvalued: {positionId: string; label: string}[] = [];
  for (const asset of input.assets) {
    if (asset.value === undefined || !asset.currency) { unvalued.push({positionId: asset.positionId, label: asset.label}); continue; }
    if (asset.value <= 0n) continue;
    const view = byCurrency.get(asset.currency) ?? {currency: asset.currency, assets: [], targets: [], flows: [], total: 0n};
    byCurrency.set(asset.currency, view);
    view.assets.push({id: asset.positionId, label: asset.label, value: asset.value, kind: 'asset', wealthClass: asset.wealthClass});
    view.total += asset.value;
    const held = BigInt(asset.quantity), mine = input.allocations.filter(a => a.positionId === asset.positionId && open.has(a.goalId) && BigInt(a.quantity) > 0n);
    const promised = mine.reduce((n, a) => n + BigInt(a.quantity), 0n);
    let given = 0n;
    for (const a of mine) {
      // value × (this promise's effective units ÷ held units), with the over-promise scaled down proportionally.
      const units = promised > held ? BigInt(a.quantity) * held / promised : BigInt(a.quantity);
      const value = held > 0n ? asset.value * units / held : 0n;
      if (value <= 0n) continue;
      given += value;
      view.flows.push({from: asset.positionId, to: `goal:${a.goalId}`, value});
      const node = view.targets.find(t => t.id === `goal:${a.goalId}`);
      if (node) node.value += value; else view.targets.push({id: `goal:${a.goalId}`, label: open.get(a.goalId)!, value, kind: 'goal'});
    }
    const rest = asset.value - given;
    if (rest > 0n) {
      view.flows.push({from: asset.positionId, to: AVAILABLE, value: rest});
      const node = view.targets.find(t => t.id === AVAILABLE);
      if (node) node.value += rest; else view.targets.push({id: AVAILABLE, label: 'Still available', value: rest, kind: 'available'});
    }
  }
  const views = [...byCurrency.values()].map(v => ({...v,
    assets: v.assets.sort((a, b) => (b.value > a.value ? 1 : b.value < a.value ? -1 : a.label.localeCompare(b.label))),
    // Goals by size, "Still available" last.
    targets: v.targets.sort((a, b) => (a.kind === 'available' ? 1 : 0) - (b.kind === 'available' ? 1 : 0) || (b.value > a.value ? 1 : b.value < a.value ? -1 : a.label.localeCompare(b.label))),
  })).sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : a.currency.localeCompare(b.currency)));
  return {views, unvalued};
}
/** wealthOverview(...).rows → the assets this needs (structural). */
export function purposeAssets(rows: readonly {position: {id: string; asset: string; providerId: string; quantity: string}; wealthClass: string; currency?: string; value?: bigint}[], label: (row: {position: {id: string; asset: string; providerId: string}}) => string = r => r.position.asset): PurposeAsset[] {
  return rows.map(r => ({positionId: r.position.id, label: label(r), wealthClass: r.wealthClass, quantity: r.position.quantity, ...(r.currency ? {currency: r.currency} : {}), ...(r.value !== undefined ? {value: r.value} : {})}));
}

/** The diagram's geometry, pure: node rectangles on two columns and each flow as a band (y at both ends, thickness). */
export type Layout = {width: number; height: number; nodes: {id: string; x: number; y: number; h: number; side: 'left' | 'right'}[]; bands: {from: string; to: string; y0: number; y1: number; thickness: number}[]};
export function layoutFlows(view: PurposeView, {width = 640, nodeWidth = 14, gap = 10, minNode = 26, unit = 30}: {width?: number; nodeWidth?: number; gap?: number; minNode?: number; unit?: number} = {}): Layout {
  const count = Math.max(view.assets.length, view.targets.length), base = Math.max(160, count * unit + (count - 1) * gap);
  // Each node gets its share of the column, but never less than a label's height; the column grows to fit.
  const sizes = (side: readonly FlowNode[]) => { const space = base - (side.length - 1) * gap, total = Number(view.total) || 1; return side.map(n => Math.max(minNode, Number(n.value) / total * space)); };
  const left = sizes(view.assets), right = sizes(view.targets);
  const used = (h: readonly number[]) => h.reduce((a, b) => a + b, 0) + Math.max(0, h.length - 1) * gap;
  const height = Math.max(base, used(left), used(right));
  const place = (side: readonly FlowNode[], heights: readonly number[], x: number, which: 'left' | 'right') => {
    let y = (height - used(heights)) / 2;
    return side.map((n, i) => { const node = {id: n.id, x, y, h: heights[i]!, side: which}; y += heights[i]! + gap; return node; });
  };
  const nodes = [...place(view.assets, left, 0, 'left'), ...place(view.targets, right, width - nodeWidth, 'right')];
  const outAt = new Map<string, number>(), inAt = new Map<string, number>();
  const bands = view.flows.map(f => {
    const a = nodes.find(n => n.id === f.from && n.side === 'left')!, b = nodes.find(n => n.id === f.to && n.side === 'right')!;
    const fromNode = view.assets.find(n => n.id === f.from)!, toNode = view.targets.find(n => n.id === f.to)!;
    const t0 = a.h * Number(f.value) / Math.max(1, Number(fromNode.value)), t1 = b.h * Number(f.value) / Math.max(1, Number(toNode.value));
    const y0 = a.y + (outAt.get(a.id) ?? 0) + t0 / 2, y1 = b.y + (inAt.get(b.id) ?? 0) + t1 / 2;
    outAt.set(a.id, (outAt.get(a.id) ?? 0) + t0); inAt.set(b.id, (inAt.get(b.id) ?? 0) + t1);
    return {from: f.from, to: f.to, y0, y1, thickness: Math.max(1.5, Math.min(t0, t1))};
  });
  return {width, height, nodes, bands};
}
