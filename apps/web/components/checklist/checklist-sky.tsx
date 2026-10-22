/**
 * The Checklist's sky (P7.18). Session AG (owner pointers 11–12): the app dashboard's own ground in each theme — Nebula's
 * starfield on the night, Light's white-family mist, Dark's black sky (the same rules as the shell's `.app-content::before`,
 * app/visual-v21.css and themes/*.extra.css) — so the Checklist feels part of ZIGoals; Nebula keeps its owner-approved calm
 * drifting mist, still under reduced motion and Motion Off. The planet is the app's own destination art
 * (`/art/v21/destination.webp`, already loaded by the sidebar on a computer), low on the right behind everything, loaded
 * lazily; Session AG Polish (pointer 9): phones and tablets show the same art from a small 640 px file (srcset), so a
 * phone downloads about 16 kB. Decorative and fixed behind the path; nothing on top of it changes colour with the theme.
 */
export function ChecklistSky() {
  return <div className="checklist-sky" aria-hidden="true">
    <span className="checklist-mist checklist-mist-a"/><span className="checklist-mist checklist-mist-b"/><span className="checklist-mist checklist-mist-c"/>
    {/* eslint-disable-next-line @next/next/no-img-element -- the app's existing art, lazily, as the sidebar shows it */}
    <span className="checklist-planet"><img src="/art/v21/destination.webp" srcSet="/art/checklist/destination-640.webp 640w, /art/v21/destination.webp 1000w" sizes="(max-width: 1179.98px) 210px, 62vw" alt="" width={1000} height={689} loading="lazy" decoding="async"/></span>
  </div>;
}
