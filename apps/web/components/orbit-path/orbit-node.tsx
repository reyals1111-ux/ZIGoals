import {NebulaGlyph} from './nebula-glyph';
import './orbit-node.css';

/**
 * Session AG (ADR-029; owner pointers 1–2, reference 02): a node in the footer banner's design — a dark glass disc, a thin
 * neon ring in the node's colour with a soft outer glow, and one line glyph inside (components/footer: the
 * `.site-footer-node`). Session AG Polish (ADR-030, requests 1a and 1c): the glyph is drawn in the nebula colour flow
 * (`NebulaGlyph`), never the node's colour. Unlit (not done): matte — a grey ring faintly tinted with the node's own hue,
 * no glow, the glyph dimmed. Lit (done): the ring in full neon with its glow and the glyph bright. `just`: it has just
 * lit — the ring blooms once (CSS; still under reduced motion and Motion Off).
 *
 * The face goes inside any element carrying `.orbit-node`, `--node` (the colour) and `data-lit` — the Checklist's path dot
 * today, Earn's Start-here path later (S1, AF12). Decorative: the element around it carries the name and the state.
 */
export function OrbitNodeFace({glyph, just = false}: {glyph: string; just?: boolean}) {
  return <>
    <span className="orbit-node-glyph path-dot-core"><NebulaGlyph name={glyph}/></span>
    {just && <span className="orbit-node-bloom" aria-hidden="true"/>}
  </>;
}
