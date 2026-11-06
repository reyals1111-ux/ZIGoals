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
