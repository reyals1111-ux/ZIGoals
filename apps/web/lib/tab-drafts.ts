/**
 * Session AL (security delta review B, SB-6): the unsaved forms this tab keeps in sessionStorage across a reload — the
 * welcome's first name and goal (`zigoals:welcome-draft:v1`), a new habit's title (`zigoals:habit-draft:v1`) and the Goal
 * wizard's fields (`zigoals:draft:goal-wizard:v1`). They are not tied to an account, so the account's erase and Sign out
 * clear them: a draft never prefills the next account's form in the same tab. Erase everything removes them already.
 * Never throws: a storage that refuses keeps the draft (it goes when the tab closes).
 */
export const TAB_DRAFT_KEY = /^zigoals:(?:[a-z0-9-]+-draft:|draft:)/;
type DraftStore = Pick<Storage, 'length' | 'key' | 'removeItem'>;
export function forgetTabDrafts(store?: DraftStore | null): string[] {
  let target = store ?? null;
  try { target ??= typeof window === 'undefined' ? null : window.sessionStorage; } catch { return []; }
  if (!target) return [];
  const gone: string[] = [];
  try {
    const keys: string[] = [];
    for (let i = 0; i < target.length; i++) { const k = target.key(i); if (k && TAB_DRAFT_KEY.test(k)) keys.push(k); }
    for (const k of keys) { try { target.removeItem(k); gone.push(k); } catch { /* kept until the tab closes */ } }
  } catch { /* no session storage here */ }
  return gone;
}
