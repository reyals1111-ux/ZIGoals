/**
 * Session AH Part 3 (A7, BUG-042) and Part 5 (VA1): an error said to a person is a sentence, never a validation dump. A
 * schema error (zod's list of issues), a message that is JSON or a stack, or a long technical message becomes the
 * caller's own plain fallback; an ordinary sentence the app wrote itself is kept.
 */
export function plainErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return typeof error === 'string' && readable(error) ? error : fallback;
  if ((error as {issues?: unknown}).issues !== undefined || error.name === 'ZodError' || error.name === '$ZodError') return fallback;
  return readable(error.message) ? error.message : fallback;
}
function readable(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 300) return false;
  if (/^[[{]/.test(t) || /"(code|path|expected|received)"\s*:/.test(t)) return false; // JSON
  if (/\n\s+at\s|^\w*Error:|TypeError|ReferenceError|undefined is not|Cannot read propert/.test(t)) return false; // a stack or an engine message
  return true;
}
