import type {ToolEnv} from '../tools/env';
import {earnCoachAnswer} from '../earn/coach';
import {quickCommand} from '../quick-commands/commands';
import {briefChatText} from '../proactive/brief';
import {cardHelp} from '../context/card-help';
import {cardOnPage} from '../context/page-view';
import type {LocalReply} from './engine';

/**
 * Session AF (L4): this session's answers on the device, asked before the lookups (lib/ai/local-answers/engine.ts): the
 * Checklist commands (P8.6), the Earn coach (P8.5), "what am I looking at" and "explain this card" (P8.7), and the brief
 * and recap asked in words (P8.2). Each has its own stop rule; anything else returns null and the existing routes decide
 * exactly as before. Nothing here calls a model, fetches anything or writes: a command is a card the person adds.
 */
const BRIEF_ASK = /^(?:(?:hey|hi|ok|okay|so|zigi),?\s+)*(?:what(?:'s| is) my (?:plan|day|brief|briefing)(?: for)?(?: today)?|(?:give me |read me |read )?(?:my )?(?:morning )?brief(?:ing)?(?: me)?(?: please)?|brief me|how does my day look|plan for today|wat is mijn plan(?: voor)?(?: vandaag)?|(?:lees )?mijn (?:ochtend)?briefing(?: voor)?|lees (?:mijn )?(?:ochtend)?briefing voor|hoe ziet mijn dag eruit)[.!?]?$/i;
const RECAP_ASK = /^(?:(?:hey|hi|ok|okay|so|zigi),?\s+)*(?:how did (?:my day|today) go|what did i do today|recap(?: my day| today)?|(?:my )?evening recap|sum up (?:my day|today)|hoe ging (?:mijn dag|vandaag)|wat heb ik vandaag gedaan|(?:mijn )?avondoverzicht|vat (?:mijn dag|vandaag) samen)[.!?]?$/i;
const LOOKING = /^(?:(?:hey|hi|ok|okay|so|zigi),?\s+)*(?:what am i looking at|what(?:'s| is) on (?:this|my) (?:page|screen)|what (?:does|is) this page(?: show)?|wat zie ik(?: hier)?|wat staat (?:er )?op (?:deze|dit|mijn) (?:pagina|scherm))[.!?]?$/i;
const EXPLAIN_CARD = /^(?:(?:hey|hi|ok|okay|so|zigi),?\s+)*(?:explain|what is|what's|what does)\s+(?:this|that|the)\s+(.{0,50}?)\s*(?:card|widget|section|part)(?:\s+(?:show|mean|do))?[.!?]?$|^(?:(?:hé|hoi|zigi),?\s+)*(?:leg|wat is|wat betekent)\s+(?:deze|die|de|het)\s+(.{0,50}?)\s*(?:-?kaart|blok|widget|deel)(?:\s+uit)?[.!?]?$/i;
const nl = (q: string) => /\b(?:wat|leg|deze|dit|mijn|hoe|ging|heb|ik|vandaag|zie|staat|kaart|lees|vat|samen|briefing)\b/i.test(q) && !/\b(?:what|how|explain|my|me|the|this|today|brief me)\b/i.test(q);
export function afLocalAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim();
  if (!q || q.length > 200) return null;
  // The Checklist by voice and text: a card the person adds.
  const command = quickCommand(q, env);
  if (command) return {kind: command.kind, text: command.text, calls: command.command === 'list' ? [{tool: 'checklist_today', args: {}, label: 'Checklist · today'}] : []};
  // The Earn coach: signing refused, the ways to earn, Start here, the glossary (figures only from the snapshot).
  const coach = earnCoachAnswer(q, env.earn);
  if (coach) return {kind: coach.kind, text: coach.text, calls: coach.kind === 'answer' && /\(source: |\(bron: /.test(coach.text) ? [{tool: 'earn_rates', args: {}, label: 'Earn figures'}] : []};
  // The page: titles only (never values); nothing on Settings or a private screen.
  const looking = LOOKING.test(q), card = !looking ? EXPLAIN_CARD.exec(q) : null;
  if (looking || card) {
    const lang = nl(q) ? 'nl' : 'en', view = env.pageView;
    // No page view (Settings, a private screen, or none read): the other routes decide, as before this session.
    if (!view) return null;
    if (looking) {
      const shown = view.cards.filter(c => c.inView).slice(0, 6);
      if (!shown.length) return {kind: 'answer', text: lang === 'nl' ? `Je bent op ${view.page}. Er is nu geen kaart in beeld.` : `You are on ${view.page}. No card is in view right now.`, calls: [{tool: 'page_view', args: {}, label: 'This page'}]};
      const lines = shown.map(c => { const help = cardHelp(c.id, lang); return `• ${c.label}${help ? ` — ${help}` : ''}`; });
      const head = lang === 'nl' ? `Je bent op ${view.page}. In beeld:` : `You are on ${view.page}. In view:`;
      return {kind: 'answer', text: [head, ...lines, ...(view.healthHidden ? [lang === 'nl' ? `${view.healthHidden} Health-kaarten worden niet met ZIGi gedeeld.` : `${view.healthHidden} Health cards are not shared with ZIGi.`] : []), lang === 'nl' ? 'Alleen de titels: ZIGi leest hier geen waarden.' : 'Titles only: ZIGi reads no values here.'].join('\n'), calls: [{tool: 'page_view', args: {}, label: 'This page'}]};
    }
    const found = cardOnPage(view, (card![1] ?? card![2] ?? '').trim());
    const help = found ? cardHelp(found.id, lang) : null;
    if (found && help) return {kind: 'answer', text: `${help}\n\n${lang === 'nl' ? 'Over de kaart, niet over je cijfers: vraag naar een cijfer en ZIGi zoekt het op.' : 'About the card, not your figures: ask for a figure and ZIGi looks it up.'}`, calls: [{tool: 'page_view', args: {card: found.id}, label: `This page · ${found.label}`}]};
    return null; // a card ZIGi has no note for: the person's AI, with the page's titles (the question context's "This page")
  }
  // The brief and the recap, asked in words (the same as /brief and /recap).
  if (BRIEF_ASK.test(q)) return {kind: 'answer', text: briefChatText(env, 'morning', {snapshot: env.earn}), calls: []};
  if (RECAP_ASK.test(q)) return {kind: 'answer', text: briefChatText(env, 'evening', {snapshot: env.earn}), calls: []};
  return null;
}
