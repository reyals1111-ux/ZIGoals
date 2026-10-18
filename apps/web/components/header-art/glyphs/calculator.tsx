import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): the compound interest calculator — a growth curve bending upward on a small grid, the
 * compounding steps as dots and a coin where it arrives. */
export function CalculatorGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M90 72v74M110 72v74M130 72v74M72 90h76M72 110h76M72 130h76" stroke={accent} strokeWidth="1" opacity=".3"/>
    <path d="M70 70v78h80" strokeWidth="1.8"/>
    <path d="M72 144c38-2 60-26 70-62v66H72z" fill={fill} stroke="none"/>
    <path d="M72 144c38-2 60-26 70-62" stroke={line} strokeWidth="2.2"/>
    <circle cx="102" cy="136.5" r="2.4" className="ha-ink-a" stroke="none"/>
    <circle cx="117.5" cy="125.8" r="2.4" className="ha-ink-a" stroke="none"/>
    <circle cx="132.2" cy="106.6" r="2.4" className="ha-ink-a" stroke="none"/>
    <circle cx="142" cy="74" r="9.5" fill={fill} stroke={accent} strokeWidth="1.8"/>
    <circle cx="142" cy="74" r="5" stroke={accent} strokeWidth="1.2" opacity=".7"/>
  </g>;
}
