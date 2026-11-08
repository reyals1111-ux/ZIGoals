/**
 * Session AL (TK-162; D-155, fifth pass): a sideways-scrolling data table says in words that columns sit off to its right.
 * Render it right after the table's `.data-table-wrap` (whose `useScrollEdges` sets `data-more-right`): data-table.css
 * shows it only while there is more to the right. Markets' table and Portfolio's holdings share it.
 */
export function DataTableMore() {
  return <p className="data-table-more" aria-hidden="true">More columns to the right: swipe the table sideways.</p>;
}
