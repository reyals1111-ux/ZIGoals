/**
 * Session AH Part 3 (A7, BUG-042) and Part 5 (VA1, C1, C2): an error said to a person is a sentence, never a validation
 * dump. A schema error (zod's list of issues) becomes a short sentence for its first issue when one fits ("Use at most 100
 * characters."), else the caller's own plain fallback; a message that is JSON or a stack becomes the fallback; an ordinary
 * sentence the app wrote itself is kept.
 */
type Issue = {errors?: Issue[][]; code?: string; message?: string; minimum?: number | bigint; maximum?: number | bigint; origin?: string; type?: string; inclusive?: boolean; path?: unknown[]};
const n = (v: number | bigint | undefined) => typeof v === 'bigint' ? v.toString() : typeof v === 'number' ? v.toLocaleString('en-GB') : '';
/** The schemaVersion is refused, or, for a union of versioned schemas, every version refused it. */
function isNewerVersion(issue: Issue): boolean {
  if (Array.isArray(issue.path) && issue.path.at(-1) === 'schemaVersion') return true;
  return issue.code === 'invalid_union' && Array.isArray(issue.errors) && issue.errors.length > 0 && issue.errors.every(branch => branch.some(isNewerVersion));
}
export function issueSentence(issue: Issue): string | null {
  const kind = issue.origin ?? issue.type;
  // A record from a newer build (its schemaVersion is one this build does not know) says so, with the field's name, so
  // the person knows to update the app rather than suspect the file (run11-recovery-failures).
  if (isNewerVersion(issue)) return 'This file was made by a newer version of ZIGoals (its schemaVersion is one this version does not read). Update the app, then try again. Existing records were preserved.';
  // A message the app wrote itself (a refine or a custom check) is kept when it reads as a sentence.
  if (issue.code === 'custom' && issue.message && readable(issue.message) && !/^Invalid/.test(issue.message)) return issue.message;
  if (issue.code === 'too_big' && kind === 'string') return `Use at most ${n(issue.maximum)} characters.`;
  if (issue.code === 'too_small' && kind === 'string') return Number(issue.minimum) <= 1 ? 'This can’t be empty.' : `Use at least ${n(issue.minimum)} characters.`;
  if (issue.code === 'too_big' && (kind === 'number' || kind === 'bigint')) return `Enter ${n(issue.maximum)} or less.`;
  if (issue.code === 'too_small' && (kind === 'number' || kind === 'bigint')) return issue.inclusive === false && Number(issue.minimum) === 0 ? 'Enter an amount above zero.' : `Enter ${n(issue.minimum)} or more.`;
  if (issue.code === 'too_big' && kind === 'array') return `Up to ${n(issue.maximum)} fit here.`;
  if (issue.message && readable(issue.message) && !/^(Invalid|Expected|Too (big|small))/i.test(issue.message)) return issue.message;
  return null;
}
export function plainErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return typeof error === 'string' && readable(error) ? error : fallback;
  const issues = (error as {issues?: unknown}).issues;
  if (Array.isArray(issues)) return (issues.length ? issueSentence(issues[0] as Issue) : null) ?? fallback;
  if (error.name === 'ZodError' || error.name === '$ZodError') return fallback;
  return readable(error.message) ? error.message : fallback;
}
function readable(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 300) return false;
  if (/^[[{]/.test(t) || /"(code|path|expected|received)"\s*:/.test(t)) return false; // JSON
  if (/\n\s+at\s|^\w*Error:|TypeError|ReferenceError|undefined is not|Cannot read propert/.test(t)) return false; // a stack or an engine message
  return true;
}
