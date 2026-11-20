import {daysApart, type BackupReminder} from '../backup-reminder';

/**
 * Session AV Part 3 (ADR-045 D-KEEP): keeping a friend's records on their own device. Pure rules; the card is
 * components/keep-data/keep-data-card.tsx.
 *
 * - iPhone and iPad Safari can clear a website's data after seven days of use without a visit, unless the site is on the
 *   Home Screen; a Home Screen web app has its own storage, separate from Safari's tabs (Apple, WWDC23 "What's new in web
 *   apps"; docs/friends-alpha/IOS_STORAGE.md). So in a Safari tab Today says how to move: export a backup here, add ZIGoals
 *   to the Home Screen, open it there and restore. In the Home Screen app, while it holds nothing yet, Today offers
 *   "Restore a backup from Safari", so nobody opens it and thinks their records are gone.
 * - Everywhere else: one gentle offer of a copy after real new data (lib/backup-reminder.ts `copyOfferDue`).
 */
type NavLike = {userAgent?: string; platform?: string; maxTouchPoints?: number; standalone?: boolean};
/** An iPhone or iPad (iPadOS presents itself as a Mac with a touch screen). */
export function isAppleMobile(nav: NavLike): boolean {
  const ua = nav.userAgent ?? '';
  return /\b(iPhone|iPad|iPod)\b/.test(ua) || (/\bMacintosh\b/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
}
/** Where ZIGoals runs on that device: the Home Screen app, or a browser tab. */
export function appleContext(nav: NavLike, standaloneDisplay: boolean): 'home-screen' | 'tab' | null {
  if (!isAppleMobile(nav)) return null;
  return nav.standalone === true || standaloneDisplay ? 'home-screen' : 'tab';
}
/** Browsers that answer a request to keep a site's data without asking the person (Chromium, Safari); Firefox asks. */
export const persistNeverPrompts = (ua: string) => !/\b(Firefox|FxiOS)\//.test(ua);
/**
 * How many records this device holds, read cheaply: every stored record carries an id, so the ids in the app's own keys
 * are counted (a count to notice "a lot was added", never shown as a number).
 */
export function recordCount(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): number {
  let n = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith('zigoals:') || key.startsWith('zigoals:showcase:')) continue;
    const text = storage.getItem(key) ?? '';
    for (let at = text.indexOf('"id":'); at !== -1; at = text.indexOf('"id":', at + 5)) n += 1;
  }
  return n;
}
export type KeepCard = 'ios-move' | 'ios-start' | 'ios-restore' | 'copy' | null;
/**
 * Which card Today shows (at most one): in a Safari tab on an iPhone, the move to the Home Screen (with the export first
 * once there are records); in the Home Screen app with nothing in it yet, the restore; otherwise a copy when one is due.
 * "Remind me later" brings the iPhone note back after seven days; "Got it" ends it.
 */
export function keepCard(r: BackupReminder, {today, count, apple, copyDue}: {today: string; count: number; apple: 'home-screen' | 'tab' | null; copyDue: boolean}): KeepCard {
  if (apple === 'tab' && !r.iosNoteDoneOn && !(r.iosNoteLaterOn && daysApart(r.iosNoteLaterOn, today) < 7)) return count > 0 ? 'ios-move' : 'ios-start';
  if (apple === 'home-screen' && count === 0 && !r.restoreOfferDoneOn) return 'ios-restore';
  return copyDue ? 'copy' : null;
}
