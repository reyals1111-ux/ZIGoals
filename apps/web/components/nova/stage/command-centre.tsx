import './command-centre.css';

/**
 * Session AM-2 (ADR-038 "AM-2", G1–G2): the stage as a command centre. Two decorations around the widget plane, both
 * static (B2: nothing here animates) and both hidden from assistive technology (what they say is said by the status
 * chips and the View menu):
 *
 * - `StageDepth`: the deep sky behind everything — layered nebula clouds and a horizon under the star. It sits inside
 *   the HUD's depth layer, under the far grid plane. (The star's light streak is carried across the stage by a line
 *   inside the star's own button, `.cc-streak` in nova-stage.tsx, so it stays at the star's height while the stage scrolls.)
 * - `StageHud`: the instrument the person looks through — four corner brackets and two tick rulers around the stage,
 *   with four small true read-outs: how many widgets are on the stage, the motion in force, that the data stays on this
 *   device, and the arrangement. It stays in place while the stage scrolls under it and never takes a tap.
 */
export function StageDepth() {
  return <><span className="cc-nebula"/><span className="cc-horizon"/></>;
}
const MOTION_WORD: Record<string, string> = {full: 'Full', calm: 'Calm', still: 'Off', paused: 'Paused'};
const LAYOUT_WORD: Record<string, string> = {orbit: 'Orbit', bento: 'Bento', focus: 'Focus', minimal: 'Minimal'};
export function StageHud({widgets, motion, layout, showcase}: {widgets: number; motion: string; layout: string; showcase: boolean}) {
  return <div className="cc-hud" aria-hidden="true" data-stage={widgets ? 'set' : 'calm'}>
    <div className="cc-hud-frame">
      <i className="cc-corner" data-at="tl"/><i className="cc-corner" data-at="tr"/><i className="cc-corner" data-at="bl"/><i className="cc-corner" data-at="br"/>
      <i className="cc-rule" data-at="l"/><i className="cc-rule" data-at="r"/>
      <span className="cc-read" data-at="tl"><b>Stage</b>{widgets ? `${widgets} ${widgets === 1 ? 'widget' : 'widgets'}` : 'Calm'}</span>
      <span className="cc-read" data-at="tr"><b>Motion</b>{MOTION_WORD[motion] ?? 'Full'}</span>
      <span className="cc-read" data-at="bl"><b>{showcase ? 'Showcase' : 'Private'}</b>{showcase ? 'Example data' : 'On this device'}</span>
      <span className="cc-read" data-at="br"><b>View</b>{LAYOUT_WORD[layout] ?? 'Orbit'}</span>
    </div>
  </div>;
}
