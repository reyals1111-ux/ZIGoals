/**
 * Session AB-Design Phase 2, Part 3 (owner request 29): the one loading placeholder. A card-shaped shimmer of the content
 * that is coming (an optional chart block, then lines), with the old "Opening …" sentence kept for screen readers as a
 * polite status. The shimmer stands still under reduced motion and Motion Off (ui.css). `page` draws a page's first
 * screen instead: a title bar and two cards.
 */
export function Skeleton({label, lines = 3, block = false, page = false, className = ''}: {label: string; lines?: number; block?: boolean; page?: boolean; className?: string}) {
  if (page) return <div className={`aa-skeleton-page ${className}`.trim()} role="status" aria-busy="true">
    <span className="sr-only">{label}</span>
    <div className="aa-skeleton aa-skeleton-head" aria-hidden="true"><i/><i/></div>
    <div className="aa-skeleton" aria-hidden="true"><b/><i/><i/><i/></div>
    <div className="aa-skeleton" aria-hidden="true"><i/><i/><i/></div>
  </div>;
  return <div className={`aa-skeleton ${className}`.trim()} role="status" aria-busy="true">
    <span className="sr-only">{label}</span>
    {block && <b aria-hidden="true"/>}
    {Array.from({length: lines}, (_, i) => <i key={i} aria-hidden="true"/>)}
  </div>;
}
