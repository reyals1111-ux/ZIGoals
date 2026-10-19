/**
 * Session AF (L5a, Part 10.13): differences the parity test found in files this lane does not own, each listed for the
 * lead in docs/handoff/af-lanes/L5a.md with its fix. The spec leaves exactly these out of its failure list (by route,
 * state, element and property) and names each in the test's annotations; remove an entry once its fix lands. Never a
 * place to hide a difference of this lane's own files.
 */
export type Known = {route: string; state: string; desc: string; prop: string; owner: string; why: string};
export const KNOWN: readonly Known[] = [
  ...['/app', '/app/goals'].map(route => ({route, state: 'empty', desc: 'img', prop: 'filter', owner: 'components/zigi/zigi-figure.tsx',
    why: 'ZigiFigure does not import ./zigi.css, so on a new device (where nothing else loads it) Nebula draws the figure without its drop shadow, while the Light and Dark sheets carry .zigi img\'s shadow; the fix is `import \'./zigi.css\'` in zigi-figure.tsx (Nebula gains the shadow it was drawn with)'})),
];
export const isKnown = (route: string, state: string, d: {desc: string; prop: string}) => KNOWN.some(k => k.route === route && k.state === state && k.prop === d.prop && (d.desc === k.desc || d.desc.endsWith(` ${k.desc}`)));
