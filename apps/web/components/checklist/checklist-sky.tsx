/**
 * The Checklist's sky (P7.18; Session AF L3b, the owner's "slowly moving star system"): in Nebula, three drifting colour
 * clouds (violet, magenta, teal; round 4: seen at a glance), three layers of stars drifting at different speeds, a distant ringed planet turning slowly and a small moon on its
 * orbit — the owner-approved loop of the full-screen Checklist; in Light a calm white sky with a light colour mist; in Dark
 * black with a subtle mist. Every layer moves by transform only; reduced motion and Motion Off hold it still. Decorative
 * and fixed behind the path; the planets, lines and colours on top are the same in every theme.
 */
export function ChecklistSky() {
  return <div className="checklist-sky" aria-hidden="true">
    <span className="checklist-mist checklist-mist-a"/><span className="checklist-mist checklist-mist-b"/><span className="checklist-mist checklist-mist-c"/>
    <span className="checklist-stars checklist-stars-far"/><span className="checklist-stars"/><span className="checklist-stars checklist-stars-near"/>
    <span className="checklist-world"><span className="checklist-world-ring"/></span>
    <span className="checklist-moon-orbit"><span className="checklist-moon"/></span>
  </div>;
}
