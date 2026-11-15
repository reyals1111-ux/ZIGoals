/**
 * Session AL (DV-064, DV-004, P-DV-36; keep-list DV-032): when the goal creator asks "Discard your unsaved Goal changes?"
 * before leaving. Only for something typed and not yet saved; a draft brought back from earlier in this tab and left
 * untouched asks nothing (it is already kept, and nothing was changed this time).
 */
export function wizardGuardOn({saved, restored, touched, typed}: {saved: boolean; restored: boolean; touched: boolean; typed: boolean}): boolean {
 return !saved && typed && (touched || !restored);
}

/**
 * Session AL fourth pass (BN-153, BN-188): marks the creator "touched" on its first typed input without losing that input.
 * It was `onInputCapture`: React runs capture handlers from the root's capture listener, and the browser flushes the
 * resulting render (a microtask) before the bubble listener that fires `onChange`. That render wrote the old value ('')
 * back into the controlled field, so `onChange` saw no change and the first key ("Berlin" → "erlin") or the first
 * `fill` vanished. A bubble handler runs after the field's own `onChange`, in the same batch.
 */
export function touchOnInput(touched: boolean, setTouched: (value: true) => void): {onInput: () => void} {
 return {onInput: () => { if (!touched) setTouched(true); }};
}

/**
 * Session AL final pass (BN-155, BUG-076, G-026, DV-056b; the cause): whether text already in the creator's fields keeps
 * this tab's draft from coming back. Chrome puts the last typed values back into the fields itself on a reload or
 * Back/Forward (form restoration) before the creator reads its draft; those are the draft's own words and never block it.
 * Only text that is not in the draft (typed while the page was still loading) does: the person's latest word wins.
 */
export function draftBlockedBy(fieldValues: readonly string[], draft: Readonly<Record<string, unknown>>): boolean {
 const own = new Set(Object.values(draft).filter((v): v is string => typeof v === 'string').map(v => v.trim()));
 return fieldValues.some(v => { const t = v.trim(); return !!t && !own.has(t); });
}

/**
 * Session AL final pass (N-DV-02, D-205): whether leaving the creator asks at all. Its draft is kept in this tab and
 * brought back ("Draft restored · Discard"), so leaving it (a sidebar link, Back, a reload) asks nothing: no native
 * confirm(), no "Leave site?". Only unsaved text whose draft could not be kept (storage refused) is still guarded.
 */
export function leaveAsks({dirty, kept}: {dirty: boolean; kept: boolean}): boolean {
 return dirty && !kept;
}

/** Session AO (T-014): the creator has three steps (Your goal · What counts · Review, the rhythm a closed part of the review).
 * A draft kept by the four-step creator (2 = rhythm, 3 = review) opens on the last step, which holds both; the first step and
 * anything unreadable give null (the creator opens on step 1). The stored draft keeps its shape: `step` is still a number. */
export const GOAL_WIZARD_LAST_STEP = 2;
export function draftStepOf(value: unknown): number | null {
 const at = Number(value);
 return Number.isInteger(at) && at >= 1 ? Math.min(at, GOAL_WIZARD_LAST_STEP) : null;
}
