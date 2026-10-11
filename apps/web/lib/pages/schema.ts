import * as z from 'zod';
import {PAGES_VIEW_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * "Your pages & buttons" (Session W Part 2; synced home settings v3 `pages`, docs/product/SYNC_HOMES.md). Each page or
 * button the person chose to show or hide is stamped (`at`), so when two devices change the same switch the newer
 * choice wins instead of stopping sync; a switch never touched follows its default (Chess and the music player start
 * hidden, everything else shown). Settings and Help have no switch: they can never be hidden (owner decision W4).
 */
export const PAGE_IDS = ['today', 'goals', 'habits', 'health', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'chess', 'activity'] as const;
export const BUTTON_IDS = ['quick-add', 'zigi', 'music', 'links', 'wealth-shortcut'] as const;
export type PageId = typeof PAGE_IDS[number];
export type ButtonId = typeof BUTTON_IDS[number];
export type VisibilityId = PageId | ButtonId;
const stamp = z.iso.datetime();
export const visibilityChoiceSchema = z.strictObject({v: z.enum(['shown', 'hidden']), at: stamp});
export const pagesSchema = z.strictObject({
  version: z.literal(1),
  items: z.partialRecord(z.enum([...PAGE_IDS, ...BUTTON_IDS]), visibilityChoiceSchema),
  // The page ZIGoals opens on; `id: null` is "the first visible page" (the default), so returning to the default is a
  // stamped choice too and two devices never disagree over a removed field.
  start: z.strictObject({id: z.enum(PAGE_IDS).nullable(), at: stamp}).optional(),
});
export type Pages = z.infer<typeof pagesSchema>;
export const emptyPages = (): Pages => ({version: 1, items: {}});

/**
 * This device's mirror of the visible set (`zigoals:pages-view:v1`, device-only, a display cache with no personal
 * record): read synchronously on the first client render so the sidebar, top bar and tab bar never flash pages the
 * person hid while the private settings are still opening. The synced choice always wins once it has loaded.
 */
export {PAGES_VIEW_KEY};
export const pagesViewSchema = z.strictObject({version: z.literal(1), hidden: z.array(z.enum([...PAGE_IDS, ...BUTTON_IDS])).max(PAGE_IDS.length + BUTTON_IDS.length), start: z.enum(PAGE_IDS).optional()});
export type PagesView = z.infer<typeof pagesViewSchema>;
export const emptyPagesView = (): PagesView => ({version: 1, hidden: []});
export const PAGES_VIEW: DeviceRecordSpec<PagesView> = {key: PAGES_VIEW_KEY, schema: pagesViewSchema, empty: emptyPagesView};
