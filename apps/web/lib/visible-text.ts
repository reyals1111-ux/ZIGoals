/**
 * Names a reader can see (QA-32). A title made only of spaces, zero-width or other format characters (U+200B–U+200D,
 * U+2060, U+FEFF, direction marks) passes `trim()`, so it used to create an invisible habit or Goal. Forms refuse such a
 * name; stored-data schemas are unchanged, so existing records still read.
 */
export const INVISIBLE_NAME = "Enter a name with at least one visible character.";

export function hasVisibleText(value: string): boolean {
  return /[\p{L}\p{N}\p{S}\p{P}]/u.test(value.replace(/[\p{Cf}\p{Z}\s]/gu, ""));
}

/**
 * A name that passes `trim()` yet shows nothing. Empty and whitespace-only names are not matched: each form already
 * refuses those with its own message, which stays as it was.
 */
export function isInvisibleName(value: string): boolean {
  return value.trim() !== "" && !hasVisibleText(value);
}

/** Throws the form message for an invisible name; returns the name unchanged otherwise. */
export function visibleName(value: string, message = INVISIBLE_NAME): string {
  if (isInvisibleName(value)) throw new Error(message);
  return value;
}
