import {useId} from 'react';
import {GLYPHS} from '../path/glyph-paths';
import {PathGlyph} from '../path/path-glyphs';

/**
 * Session AG Polish (ADR-030; owner request 1a): a Checklist node's line glyph in the app's nebula colour flow — the same
 * near-white cyan → cyan → blue → violet → magenta as the headings' `--nebula-flow-mid`, the banners and the buttons —
 * as an SVG gradient on the stroke, never the node's own colour. One gradient per glyph (its own id), laid diagonally
 * across the 24-unit grid so every glyph shows the whole flow. The node around it decides how bright it is (a matte,
 * unreached node dims it; a lit one shows it in full). A name the table does not know is drawn by `PathGlyph`.
 * Decorative: the element around it carries the name.
 */
export const NEBULA_GLYPH_STOPS: readonly {offset: number; hex: string}[] = [
  {offset: 0, hex: '#effcff'}, {offset: .3, hex: '#6fe6f6'}, {offset: .55, hex: '#8fa6ff'}, {offset: .78, hex: '#c790f6'}, {offset: 1, hex: '#f08bd6'},
];
export function NebulaGlyph({name, size = 28}: {name: string; size?: number}) {
  const id = `nebula-glyph-${useId().replace(/[^a-zA-Z0-9]/g, '')}`, d = GLYPHS[name];
  if (!d) return <PathGlyph name={name} size={size}/>;
  return <svg className="nebula-glyph" data-glyph={name} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">{NEBULA_GLYPH_STOPS.map(s => <stop key={s.offset} offset={s.offset} stopColor={s.hex}/>)}</linearGradient></defs>
    <path d={d} stroke={`url(#${id})`} strokeWidth={name === 'check' ? 2.6 : 1.9} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
