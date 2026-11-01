/**
 * Session AK P8b: a guard for the cost of `:has()` in the app's CSS.
 *
 * Blink keeps ONE invalidation set for every `:has()` that is not in a selector's last part (`A:has(x) B`). Each change
 * of the page's tree under an element that such a rule watches (`:root:has(…)`, `body:has(…)` and many more) applies
 * that set, and the set is the union of every such rule's last part. So one rule whose last part names no class, id or
 * attribute (`… > :first-child`, `… > span`) makes every tree change restyle the whole document, or every element of
 * that tag. On Today in Full motion that was ~2,500 elements per frame of the Wealth total's count (41–190 ms a frame at
 * CPU 4×). Blink takes no such feature from inside `:where()` or `:not()`, so those do not count.
 *
 * `wideHasSelectors` lists the selectors that would widen the set; the test keeps the app's CSS at none.
 */

/** Splits at top-level occurrences of `sep` (not inside (), [] or quotes). */
function splitTop(text: string, test: (ch: string) => boolean): string[] {
  const out: string[] = []; let depth = 0, quote = '', start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0 && test(ch)) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out;
}

/** Removes `name(...)` groups (balanced) from a compound. */
function stripGroups(text: string, names: readonly string[]): string {
  let out = text;
  for (const name of names) {
    for (let at = out.indexOf(`:${name}(`); at >= 0; at = out.indexOf(`:${name}(`)) {
      let depth = 0, end = at + name.length + 1;
      for (; end < out.length; end++) { if (out[end] === '(') depth++; else if (out[end] === ')' && --depth === 0) break; }
      out = out.slice(0, at) + out.slice(end + 1);
    }
  }
  return out;
}

/** The selector's compounds, in order (split at top-level combinators). */
export function compounds(selector: string): string[] {
  return splitTop(selector.trim().replace(/\s*([>+~])\s*/g, '$1'), ch => ch === ' ' || ch === '>' || ch === '+' || ch === '~').filter(Boolean);
}
/** The selector's last compound (after the last top-level combinator). */
export const lastCompound = (selector: string) => compounds(selector).at(-1) ?? '';

/** True when a compound before the last one has a `:has()` and the last compound names no class, id or attribute
 * (outside `:where()`, `:not()` and `:has()`, which give Blink no feature). */
export function widensHasInvalidation(selector: string): boolean {
  if (!selector.includes(':has(')) return false;
  const parts = compounds(selector), last = parts.at(-1) ?? '';
  if (!parts.slice(0, -1).some(part => part.includes(':has('))) return false;
  return !/[.#[]/.test(stripGroups(last, ['where', 'not', 'has']));
}

/** Every selector in a stylesheet's text that widens the shared :has() invalidation set. */
export function wideHasSelectors(css: string): string[] {
  const found: string[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of text.matchAll(/([^{};]+)\{/g)) {
    const prelude = match[1]!.trim();
    if (!prelude || prelude.startsWith('@') || /^(from|to|\d+%)/.test(prelude)) continue;
    for (const selector of splitTop(prelude, ch => ch === ',')) if (widensHasInvalidation(selector)) found.push(selector.trim().replace(/\s+/g, ' '));
  }
  return found;
}
