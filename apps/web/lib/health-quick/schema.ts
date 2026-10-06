import {z} from 'zod';

/**
 * Quick logging (Session W Part 9; synced home Health v4 `quick`): the person's own water buttons (in millilitres; shown
 * in their water unit) and the foods or recipes pinned as one-tap items on the diary. One stamped group: when two
 * devices both change it, the newer edit is kept whole.
 */
const localId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const healthQuickSchema = z.strictObject({
  version: z.literal(1),
  waterSizesMl: z.array(z.number().int().min(10).max(5000)).min(1).max(6).refine(sizes => new Set(sizes).size === sizes.length, 'Each water button is a different size.'),
  pinned: z.array(z.strictObject({sourceId: localId, sourceKind: z.enum(['food', 'recipe'])})).max(12).refine(items => new Set(items.map(i => `${i.sourceKind}:${i.sourceId}`)).size === items.length, 'Each item is pinned once.'),
  updatedAt: z.iso.datetime(),
});
export type HealthQuick = z.infer<typeof healthQuickSchema>;
export const DEFAULT_WATER_SIZES_ML = [250, 500] as const;
