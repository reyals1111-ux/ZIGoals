import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AW (p5-fixes): a small reader for the unit tests of this group's CSS fixes. It finds every rule whose selector
 * list contains `selector` exactly (after spacing is normalised) and returns its declarations, each with the media query
 * it sits in ('' outside any). Enough for the flat rule files in components/; not a CSS parser.
 */
const WEB = join(__dirname, '..', '..');
export type FoundRule = {media: string; decls: Record<string, string>};
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*([>,+~])\s*/g, '$1').trim();
export function rulesFor(file: string, selector: string): FoundRule[] {
  const css = readFileSync(join(WEB, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const want = norm(selector), found: FoundRule[] = [], stack: string[] = [];
  let i = 0, head = '';
  while (i < css.length) {
    const c = css[i]!;
    if (c === '{') {
      const sel = head.trim(); head = '';
      if (sel.startsWith('@')) { stack.push(sel); i++; continue; }
      const end = css.indexOf('}', i);
      const body = css.slice(i + 1, end);
      if (sel.split(',').map(norm).includes(want)) {
        const decls: Record<string, string> = {};
        for (const part of body.split(';')) { const at = part.indexOf(':'); if (at > 0) decls[part.slice(0, at).trim()] = part.slice(at + 1).trim(); }
        found.push({media: stack.join(' '), decls});
      }
      i = end + 1; continue;
    }
    if (c === '}') { stack.pop(); head = ''; i++; continue; }
    head += c; i++;
  }
  return found;
}
/** The px value of a declaration ("14px" → 14), or NaN. */
export const px = (v: string | undefined) => v && /^-?\d+(\.\d+)?px$/.test(v.trim()) ? parseFloat(v) : NaN;
