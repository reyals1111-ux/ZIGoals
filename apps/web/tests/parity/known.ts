/**
 * Session AF (L5a, Part 10.13): differences the parity test found in files this lane does not own, each listed for the
 * lead in docs/handoff/af-lanes/L5a.md with its fix. The spec leaves exactly these out of its failure list (by route,
 * state, element and property) and names each in the test's annotations; remove an entry once its fix lands. Never a
 * place to hide a difference of this lane's own files.
 */
export type Known = {route: string; state: string; desc: string; prop: string; owner: string; why: string};
// Session AF (the lead): the ZigiFigure shadow difference is fixed (L4 imports ./zigi.css in zigi-figure.tsx); nothing is known now.
export const KNOWN: readonly Known[] = [];
export const isKnown = (route: string, state: string, d: {desc: string; prop: string}) => KNOWN.some(k => k.route === route && k.state === state && k.prop === d.prop && (d.desc === k.desc || d.desc.endsWith(` ${k.desc}`)));
