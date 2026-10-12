import {AREAS, DEFAULT_AREA_IDS as CLOUD_DEFAULT_AREA_IDS, readLifeAreas as readCloudLifeAreas} from '../goal-extras/areas';

/**
 * Session AA-Local, owner edit 1 (ADR-022 B11): ONE list of life areas, AA-Cloud's `lib/goal-extras/areas.ts`. At the merge
 * (B52) this mirror became a thin adapter over that module: the same names AA-Local's habits code used, read from the
 * same record (`zigoals:goal-extras:v1`, custom areas in its `areas` list); it never writes the key.
 */
export const DEFAULT_AREA_IDS: readonly string[] = CLOUD_DEFAULT_AREA_IDS;
export type DefaultAreaId = string;
export const AREA_LABELS: Readonly<Record<string, string>> = AREAS;
export type LifeArea = {id: string; label: string; custom: boolean; color?: string};
export const DEFAULT_AREAS: readonly LifeArea[] = Object.entries(AREAS).map(([id, label]) => ({id, label, custom: false}));
export function readLifeAreas(storage: Pick<Storage, 'getItem'> | null | undefined): LifeArea[] {
  if (!storage) return [...DEFAULT_AREAS];
  // A custom area whose id repeats a built-in or an earlier custom one is dropped (the habits code keys by id).
  try { const seen = new Set<string>(); return readCloudLifeAreas(storage).flatMap(a => { if (seen.has(a.id)) return []; seen.add(a.id); return [{id: a.id, label: a.label, custom: a.custom, ...(a.color ? {color: a.color} : {})}]; }); } catch { return [...DEFAULT_AREAS]; }
}
export const areaLabel = (areas: readonly LifeArea[], id: string | null | undefined): string | null => id ? areas.find(a => a.id === id)?.label ?? null : null;
