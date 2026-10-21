import {PathGlyph} from '../path/path-glyphs';
import './orbit-node.css';

/**
 * Session AG (ADR-029; owner pointers 1–2, reference 02): a node in the footer banner's design — a dark glass disc, a thin
 * neon ring in the node's colour with a soft outer glow, and one single-colour line glyph inside (components/footer: the
 * `.site-footer-node`). Unlit (not done): the ring, glow and glyph are switched off — a dim, desaturated version of the
 * node's own colour, still clearly a node. Lit (done): the ring and glyph in full neon with the glow. `just`: it has just
 * lit — the ring blooms once (CSS; still under reduced motion and Motion Off).
 *
 * The face goes inside any element carrying `.orbit-node`, `--node` (the colour) and `data-lit` — the Checklist's path dot
 * today, Earn's Start-here path later (S1, AF12). Decorative: the element around it carries the name and the state.
 */
export function OrbitNodeFace({glyph, just = false}: {glyph: string; just?: boolean}) {
  return <>
    <span className="orbit-node-glyph path-dot-core"><PathGlyph name={glyph}/></span>
    {just && <span className="orbit-node-bloom" aria-hidden="true"/>}
  </>;
}
