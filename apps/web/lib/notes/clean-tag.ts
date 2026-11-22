import {MAX_TAG} from './schema';

/** A tag as typed in a field: without its #, spaces as -, at most 32 characters (null when nothing is left). Pure. */
export function cleanTag(text: string): string | null {
  const t = text.trim().replace(/^#+/, '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_\-/]/gu, '').replace(/^[-/]+|[-/]+$/g, '').slice(0, MAX_TAG);
  return t || null;
}
