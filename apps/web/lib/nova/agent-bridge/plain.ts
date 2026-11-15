/**
 * Session AM-2 (step 4c): a server's words as plain text — the smallest part of ./untrusted.ts, on its own so the tool
 * list and its schema reader (./schema.ts) stay free of the redaction module. Pure.
 */
export const DESCRIPTION_MAX = 300;
/** Control characters (line feed kept apart), the C1 block, zero-width and direction marks, the byte-order mark. */
const UNSAFE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f­؜᠎​-‏‪-‮⁠-⁯﻿￹-￻]/g;
export const CUT_MARK = '… [cut]';
/** Plain text of many lines: tabs become spaces, line ends one kind, more than two empty lines two, cut to `max` with the cut said. */
export function plainText(raw: unknown, max: number): {text: string; cut: boolean} {
  const all = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(UNSAFE, '').replace(/\n{3,}/g, '\n\n').trim();
  return all.length > max ? {text: `${all.slice(0, Math.max(0, max - CUT_MARK.length)).trimEnd()}${CUT_MARK}`, cut: true} : {text: all, cut: false};
}
/** One plain line (a tool's description, a label): whitespace runs become one space, cut to `max`. */
export function plainLine(raw: unknown, max: number): string {
  const all = String(raw ?? '').replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim();
  return all.length > max ? `${all.slice(0, Math.max(0, max - 1)).trimEnd()}…` : all;
}
/** The first words of a tool result handed to the person's model (./untrusted.ts `wrapToolResult`); `holdsToolResult` looks for them. */
export const TOOL_RESULT_HEAD = 'Result of a tool on my own computer';
/** Whether a message is (or holds) a handed-back tool result: a reply to it never brings a tool card, and no tool is offered with it. */
export const holdsToolResult = (message: string | null | undefined): boolean => !!message && message.includes(TOOL_RESULT_HEAD);
