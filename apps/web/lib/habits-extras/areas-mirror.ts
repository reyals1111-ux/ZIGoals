import * as z from 'zod';
import {LIFE_AREAS_KEY} from '../aa-device-keys';

/**
 * Session AA-Local, owner edit 1 (ADR-022 B11): ONE list of life areas, AA-Cloud's. Its module `lib/goal-extras/areas.ts`
 * (device key `zigoals:life-areas:v1`) carries seven default areas plus the person's custom ones. Until AA-Cloud's PR
 * merges, this mirror carries exactly those seven ids and reads the person's custom areas from the same key, tolerantly
 * (unreadable bytes read as the defaults alone); it never writes the key. After the merge it becomes a re-export of
 * AA-Cloud's module (one line), so no second list ever exists.
 */
export const DEFAULT_AREA_IDS = ['health', 'mind', 'wealth', 'relationships', 'career', 'learning', 'fun'] as const;
export type DefaultAreaId = (typeof DEFAULT_AREA_IDS)[number];
export const AREA_LABELS: Record<DefaultAreaId, string> = {health: 'Health', mind: 'Mind', wealth: 'Wealth', relationships: 'Relationships', career: 'Career', learning: 'Learning', fun: 'Fun'};
export type LifeArea = {id: string; label: string; custom: boolean};
export const DEFAULT_AREAS: readonly LifeArea[] = DEFAULT_AREA_IDS.map(id => ({id, label: AREA_LABELS[id], custom: false}));
// The shape AA-Cloud's store writes, read loosely: any `custom` list of {id,label} (or {id,name}) joins the defaults.
const customSchema = z.looseObject({id: z.string().min(1).max(60), label: z.string().min(1).max(60).optional(), name: z.string().min(1).max(60).optional()});
const recordSchema = z.looseObject({custom: z.array(customSchema).max(100).optional(), areas: z.array(customSchema).max(100).optional()});
export function readLifeAreas(storage: Pick<Storage, 'getItem'> | null | undefined): LifeArea[] {
  let raw: string | null = null;
  try { raw = storage?.getItem(LIFE_AREAS_KEY) ?? null; } catch { raw = null; }
  if (raw === null) return [...DEFAULT_AREAS];
  try {
    const parsed = recordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [...DEFAULT_AREAS];
    const extra = [...(parsed.data.custom ?? []), ...(parsed.data.areas ?? [])].filter(a => !(DEFAULT_AREA_IDS as readonly string[]).includes(a.id));
    const seen = new Set<string>();
    const custom = extra.flatMap(a => { if (seen.has(a.id)) return []; seen.add(a.id); return [{id: a.id, label: a.label ?? a.name ?? a.id, custom: true}]; });
    return [...DEFAULT_AREAS, ...custom];
  } catch { return [...DEFAULT_AREAS]; }
}
export const areaLabel = (areas: readonly LifeArea[], id: string | null | undefined): string | null => id ? areas.find(a => a.id === id)?.label ?? null : null;
