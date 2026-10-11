'use client';
import {askZigi, launcherShown} from './ask';

/**
 * "Ask ZIGi about this" in a number's own options menu (Session V Part 9, "Explain this number"): one item per card, in
 * the menu the card already has (a Today widget's options, "Pin to Today"), so nothing moves on the page. It shows only
 * while the ZIGi launcher does, and on click hands ZIGi a question and the records behind the number as a removable
 * chip; nothing is sent before Send. The question table loads on the click.
 */
const KINDS = new Set(['goal', 'milestone', 'goals', 'habit', 'habits', 'streak', 'checkins', 'health', 'meal', 'food-entry', 'exercise', 'wealth', 'habit-history', 'sleep', 'meditation', 'chess']);
/** A goal's or a habit's question names it; without its name there is no item (a habit card keeps T's own "Ask ZIGi"). */
const NEEDS_NAME = new Set(['goal', 'milestone', 'habit']);
export function AskZigiItem({kind, metric, name}: {kind: string; metric: string; name?: string}) {
  if (!KINDS.has(kind) || (NEEDS_NAME.has(kind) && !name?.trim()) || !launcherShown()) return null;
  const ask = () => void import('../../lib/ai/proactive/explain').then(({explainFor}) => { const explain = explainFor(kind, metric, name); if (explain) askZigi(explain.question, explain.about); }).catch(() => undefined);
  return <button type="button" onClick={ask}>Ask ZIGi about this</button>;
}
/** The same for a card without an options menu (the habit history): a small corner link, shown only with the launcher. */
export function AskZigiCorner({kind, metric, label}: {kind: string; metric: string; label: string}) {
  const ask = () => void import('../../lib/ai/proactive/explain').then(({explainFor}) => { const explain = explainFor(kind, metric); if (explain) askZigi(explain.question, explain.about); }).catch(() => undefined);
  return <button type="button" className="ai-ask-link zigi-explain-corner" onClick={ask} aria-label={`Ask ZIGi: ${label}`}>Ask ZIGi</button>;
}
