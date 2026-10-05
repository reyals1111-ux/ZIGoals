/**
 * Session U Part 6 (FIX_PLAN D3, FINDINGS Q-WEB-06): the one guard for every CSV this app writes (the everything export,
 * the Health diary and body measurements). A cell a spreadsheet could run as a formula gets a leading apostrophe: one that
 * starts, after any whitespace, with = + - @, a tab, a carriage return or a line feed (OWASP "CSV Injection"), or with the
 * full-width ＝ ＋ － ＠ that some spreadsheets read the same way. Every cell is quoted and its quotes doubled.
 */
export const CSV_FORMULA_START = /^[\s]*[=+\-@\t\r\n＝＋－＠]/;
export function csvSafeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  return `"${(CSV_FORMULA_START.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
