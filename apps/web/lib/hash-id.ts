/**
 * The element id an address's fragment names (`#settings-help` → `settings-help`), or null when there is none or it is
 * not valid percent-encoding. Session X P2.7: `decodeURIComponent` throws on a fragment such as `#%`, and a throw in an
 * effect replaced the whole page with the error page, so a crafted link could keep a page from opening.
 */
export function hashId(hash: string): string | null {
  if (hash.length < 2) return null;
  try { return decodeURIComponent(hash.slice(1)); } catch { return null; }
}
