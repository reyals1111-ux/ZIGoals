'use client';
import {askZigi} from './ask';
import {useLauncherShown} from '../zigi-door';

/**
 * "Ask ZIGi about this" in a number's own options menu (Session V Part 9, "Explain this number"): one item per card, in
 * the menu the card already has (a Today widget's options, "Pin to Today"), so nothing moves on the page. It shows only
 * while the ZIGi launcher does, and on click hands ZIGi a question and the records behind the number as a removable
 * chip; nothing is sent before Send. The question table loads on the click.
 */
const KINDS = new Set(['goal', 'milestone', 'goals', 'habit', 'habits', 'streak', 'checkins', 'health', 'meal', 'food-entry', 'exercise', 'wealth', 'habit-history', 'sleep', 'meditation', 'chess']);
/** A goal's or a habit's question names it; without its name there is no item (a habit card keeps T's own "Ask ZIGi"). */
const NEEDS_NAME = new Set(['goal', 'milestone', 'habit']);
/**
 * Session AF (L4, P8.7): any card with an id on its page can offer "Explain this card": ZIGi answers from its plain-words
 * note for ZIGoals' own cards (no AI), or the person's AI explains it from the page's titles (the "This page" chip; never
 * a value). A caller passes `card` for a card whose kind has no question of its own.
 */
export function ExplainCardItem({card}: {card: {id: string; label: string}}) {
  // Session AI (ZI9; Grok's D-059, B-125, N-203): every door follows the launcher live, so ZIGi switched off leaves none.
  if (!useLauncherShown()) return null;
  const label = card.label.replace(/\s+/g, ' ').trim().slice(0, 60);
  return <button type="button" onClick={() => askZigi(`Explain the ${label} card`, {tool: 'page_view', args: {card: card.id.slice(0, 80)}, label: `This page · ${label}`})}>Explain this card</button>;
}
export function AskZigiItem({kind, metric, name, card}: {kind: string; metric: string; name?: string; card?: {id: string; label: string}}) {
  const shown = useLauncherShown();
  if (card && !KINDS.has(kind)) return <ExplainCardItem card={card}/>;
  if (!KINDS.has(kind) || (NEEDS_NAME.has(kind) && !name?.trim()) || !shown) return null;
  const ask = () => void import('../../lib/ai/proactive/explain').then(({explainFor}) => { const explain = explainFor(kind, metric, name); if (explain) askZigi(explain.question, explain.about); }).catch(() => undefined);
  return <button type="button" onClick={ask}>Ask ZIGi about this</button>;
}
/** The same for a card without an options menu (the habit history): a small corner link, shown only with the launcher. */
export function AskZigiCorner({kind, metric, label}: {kind: string; metric: string; label: string}) {
  const shown = useLauncherShown();
  if (!shown) return null;
  const ask = () => void import('../../lib/ai/proactive/explain').then(({explainFor}) => { const explain = explainFor(kind, metric); if (explain) askZigi(explain.question, explain.about); }).catch(() => undefined);
  return <button type="button" className="ai-ask-link zigi-explain-corner" onClick={ask} aria-label={`Ask ZIGi: ${label}`}>Ask ZIGi</button>;
}
