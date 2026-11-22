/**
 * Session AV lane 2 (review B3C-9): the one rule for fenced code blocks, shared by the reading view's parser
 * (lib/ai/safe-render.ts) and the notes' tick boxes (lib/notes/ticks.ts), so a line inside code is never a tick box.
 * A fence opens on three or more backticks or tildes, with at most a language name after them; it closes on the same
 * character, at least as many, and nothing else on the line. A fence never closed runs to the end. Pure; constants only.
 */
export const FENCE_OPEN = /^\s*(```+|~~~+)\s*([A-Za-z0-9_+-]*)\s*$/;
/** Whether `line` closes the fence opened with `marker` (its backticks or tildes). */
export const closesFence = (marker: string, line: string) => new RegExp(`^\\s*${marker[0] === '~' ? '~' : '`'}{${marker.length},}\\s*$`).test(line);
