/**
 * Session AL (DV-064, DV-004, P-DV-36; keep-list DV-032): when the goal creator asks "Discard your unsaved Goal changes?"
 * before leaving. Only for something typed and not yet saved; a draft brought back from earlier in this tab and left
 * untouched asks nothing (it is already kept, and nothing was changed this time).
 */
export function wizardGuardOn({saved, restored, touched, typed}: {saved: boolean; restored: boolean; touched: boolean; typed: boolean}): boolean {
 return !saved && typed && (touched || !restored);
}
