import type {CalendarHandoff, ShareHandoff} from '../../../lib/nova/handoff/handoff';

/**
 * Session AM-2 (owner's step 4b): the five things a hand-off card's button does. Each runs only from the person's own
 * press on that button (components/nova/handoff/handoff-card.tsx checks the press is a real one); nothing here is called
 * by NOVA, a model, a timer or a reply. No request leaves ZIGoals from any of them: the person's mail app, calendar app,
 * share sheet or browser tab takes it from there.
 */
export type RunResult = 'done' | 'failed' | 'cancelled';
/** A link the page follows once, in a new tab, with no opener and no referrer; removed again at once. */
function follow(href: string, download?: string): boolean {
  try {
    const link = document.createElement('a');
    link.href = href;
    if (download) link.download = download;
    else { link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; }
    link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    return true;
  } catch { return false; }
}
/** Opens the draft in the person's own mail app (their device's handler for mailto:). Only a mailto: link is ever followed here. */
export const openMail = (href: string): RunResult => /^mailto:/i.test(href) && follow(href) ? 'done' : 'failed';
/** Opens a web link in a new tab. Only an http(s) link the card's builder accepted is ever followed here. */
export const openLink = (href: string): RunResult => /^https?:\/\/[^/?#\s]/i.test(href) && follow(href) ? 'done' : 'failed';
/** Saves the .ics file through a Blob URL (the agenda export's way): a download on this device, nothing uploaded. */
export function saveCalendar(h: CalendarHandoff): RunResult {
  try {
    const url = URL.createObjectURL(new Blob([h.ics], {type: 'text/calendar;charset=utf-8'}));
    const ok = follow(url, h.fileName);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return ok ? 'done' : 'failed';
  } catch { return 'failed'; }
}
export const shareData = (h: ShareHandoff): ShareData => ({...(h.title ? {title: h.title} : {}), ...(h.text ? {text: h.text} : {}), ...(h.url ? {url: h.url} : {})});
/** Whether this browser has a share sheet for this content. */
export function canShare(h: ShareHandoff): boolean {
  try { return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(shareData(h))); } catch { return false; }
}
/** The device's own share sheet. Closing it without choosing is "cancelled": nothing left. */
export async function shareNow(h: ShareHandoff): Promise<RunResult> {
  if (!canShare(h)) return 'failed';
  try { await navigator.share(shareData(h)); return 'done'; }
  catch (e) { return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed'; }
}
/** What "Copy" puts on the clipboard for a share: the text, then the link. */
export const shareText = (h: ShareHandoff): string => [h.text, h.url].filter(Boolean).join('\n');
export async function copyOut(text: string): Promise<RunResult> {
  try { await navigator.clipboard.writeText(text); return 'done'; } catch { return 'failed'; }
}
