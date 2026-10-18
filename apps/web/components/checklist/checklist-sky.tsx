/**
 * The Checklist's sky (P7.18): in Nebula, the app's own starfield with two nebula mists that drift slowly (the one loop
 * on the page, the owner-approved Nebula background, still under reduced motion and Motion Off); in Light, white with a
 * very light colour mist; in Dark, black with a subtle mist. Decorative and fixed behind the page; the dots, lines and
 * colours on top are the same in every theme.
 */
export function ChecklistSky() {
  return <div className="checklist-sky" aria-hidden="true"><span className="checklist-mist checklist-mist-a"/><span className="checklist-mist checklist-mist-b"/><span className="checklist-stars"/></div>;
}
