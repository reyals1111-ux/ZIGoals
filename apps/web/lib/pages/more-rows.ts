import type {PagesView} from './schema';
import {isShown} from './visibility';

/**
 * Session AO (DV-274, NB-045): the phone's More sheet, row by row and in its order: the navigation's More entries (Settings
 * and Help held back for the end), the Journey while the game layer is on, "More pages" while a page that starts off is
 * off, ZIGi's own row, the soundtrack while the music player shows, Status & wallet, then Settings and Help. The sheet
 * (components/phone/phone-chrome.tsx) draws exactly this list and Settings → Your pages & buttons names it in its preview,
 * so the two cannot drift apart.
 */
export type MoreRow<T extends readonly [string, string, ...unknown[]]> =
  | {kind: 'page'; href: string; label: string; item: T}
  | {kind: 'journey'; href: '/app/journey'; label: 'Journey'}
  | {kind: 'more-pages'; href: '/app/settings#your-pages'; label: 'More pages'}
  /** ZIGi's row decides for itself (components/ai/ai-more-row.tsx): only "Show ZIGi again", never below 901 px, where the
   *  phone's sheet lives, so the preview of a phone leaves it out (`label` null). */
  | {kind: 'zigi'; label: null}
  | {kind: 'music'; label: 'Your soundtrack'}
  | {kind: 'status'; label: 'Status & wallet'};

/** The pages that start off (Chess always, the chain's pages until chosen) and that More's "More pages" row points to. */
export const MORE_PAGES_OFF = ['staking', 'ecosystem', 'chess'] as const;
const LAST = ['/app/settings', '/app/help'];

export function moreSheetRows<T extends readonly [string, string, ...unknown[]]>(more: readonly T[], {view, gameOn}: {view: PagesView; gameOn: boolean}): MoreRow<T>[] {
  const page = (item: T): MoreRow<T> => ({kind: 'page', href: item[0], label: item[1], item});
  // Session AL (DV-095, NB-028, BN-072): one Journey row. The game layer also registers Journey as a navigation entry, so
  // that entry is left out here and the sheet keeps its own row, which follows the game switch the person sees.
  const pages = more.filter(([href]) => !LAST.includes(href) && href !== '/app/journey').map(page), last = more.filter(([href]) => LAST.includes(href)).map(page);
  const rows: MoreRow<T>[] = [...pages];
  if (gameOn) rows.push({kind: 'journey', href: '/app/journey', label: 'Journey'});
  if (MORE_PAGES_OFF.some(id => !isShown(view, id))) rows.push({kind: 'more-pages', href: '/app/settings#your-pages', label: 'More pages'});
  rows.push({kind: 'zigi', label: null});
  if (isShown(view, 'music')) rows.push({kind: 'music', label: 'Your soundtrack'});
  rows.push({kind: 'status', label: 'Status & wallet'}, ...last);
  return rows;
}

/** The names a person reads in the phone's More sheet, in order (the preview's "In More" line). */
export const moreSheetLabels = (rows: readonly MoreRow<readonly [string, string, ...unknown[]]>[]) => rows.flatMap(row => row.label === null ? [] : [row.label]);
