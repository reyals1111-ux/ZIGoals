import {platformSchema, type Platform} from './positions';

/**
 * Session AL (PR-053, P-PR-28): an archived asset can be deleted for good, not only unarchived. Only an archived, manually
 * tracked asset that no Goal's funding history or financial evidence refers to: those records must keep adding up, so
 * such an asset stays archived and the reason is said. Deleting removes the asset with its own price records and its
 * Activity lines; `removed` is what Undo puts back.
 */
type At<T> = {index: number; item: T}[];
export type DeletedAsset = {position: Platform['positions'][number]; index: number; valuationSnapshots: At<Platform['valuationSnapshots'][number]>; snapshots: At<Platform['snapshots'][number]>; assetEvents: At<Platform['assetEvents'][number]>};
const picked = <T extends {positionId: string}>(list: readonly T[], id: string): At<T> => list.flatMap((item, index) => item.positionId === id ? [{index, item}] : []);
/** Puts each item back at the index it had (order kept when nothing changed since). */
const putBack = <T>(list: readonly T[], at: At<T>): T[] => { const out = [...list]; for (const {index, item} of at) out.splice(Math.min(index, out.length), 0, item); return out; };

/** Why this asset cannot be deleted for good, or null when it can. */
export function deleteBlocker(s: Platform, id: string): string | null {
  const p = s.positions.find(x => x.id === id);
  if (!p) return 'This asset is no longer here.';
  if (!p.archivedAt) return 'Archive the asset first.';
  if (p.sourceType !== 'MANUAL') return 'Only manually tracked assets can be deleted here.';
  if (s.contributions.some(e => e.positionId === id)) return 'A Goal’s funding history names this asset, so it stays archived to keep that history whole.';
  if ((s.financialEvents ?? []).some(e => e.relatedPositionId === id)) return 'Your financial evidence names this asset, so it stays archived to keep that record whole.';
  return null;
}

export function deleteArchivedAsset(s: Platform, id: string): {next: Platform; removed: DeletedAsset} {
  const blocker = deleteBlocker(s, id);
  if (blocker) throw Error(blocker);
  const index = s.positions.findIndex(x => x.id === id), position = s.positions[index]!;
  const removed: DeletedAsset = {
    position, index,
    valuationSnapshots: picked(s.valuationSnapshots, id),
    snapshots: picked(s.snapshots, id),
    assetEvents: picked(s.assetEvents, id),
  };
  const next = platformSchema.parse({
    ...s,
    positions: s.positions.filter(x => x.id !== id),
    valuationSnapshots: s.valuationSnapshots.filter(v => v.positionId !== id),
    snapshots: s.snapshots.filter(v => v.positionId !== id),
    assetEvents: s.assetEvents.filter(e => e.positionId !== id),
  });
  return {next, removed};
}

/** Undo: puts the asset back where it was, with its records, keeping anything added since. */
export function reinsertDeletedAsset(removed: DeletedAsset) {
  return (s: Platform): Platform => {
    if (s.positions.some(x => x.id === removed.position.id)) return s;
    const positions = [...s.positions];
    positions.splice(Math.min(removed.index, positions.length), 0, removed.position);
    return platformSchema.parse({
      ...s, positions,
      valuationSnapshots: putBack(s.valuationSnapshots, removed.valuationSnapshots),
      snapshots: putBack(s.snapshots, removed.snapshots),
      assetEvents: putBack(s.assetEvents, removed.assetEvents),
    });
  };
}
