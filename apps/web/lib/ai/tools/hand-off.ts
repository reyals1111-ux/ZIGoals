import {HANDOFF_KINDS, MAX_BODY, MAX_SUBJECT, MAX_TITLE, MAX_TO} from '../../nova/handoff/handoff';
import {HAND_OFF_TOOL, handOffArgs, handoffFromArgs, type HandOffArgs} from '../../nova/handoff/model';
import {CARD_TITLE} from '../../nova/handoff/words';
import {refuse} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AM-2 (owner's step 4b; TIER 3 (AI safety)): `hand_off`, the one closed tool with which a connected model can
 * *prepare* something for outside ZIGoals on NOVA's surface: an email draft, a calendar file, a share, a link, a copy.
 *
 * It is read-only like every tool: it reads nothing of the person's records, writes nothing, fetches nothing, opens
 * nothing and returns only "noted". NOVA's conversation turns the call into a confirm card after the reply arrives
 * (components/nova/handoff/use-handoffs.ts), and only the person's own press on that card's button opens their mail app,
 * saves the file, opens the share sheet or the link, or copies. There is no argument and no tool anywhere that sends,
 * that picks the moment, or that skips the card (lib/ai/tools/hand-off.test.ts).
 *
 * The arguments are a kind and a few small plain fields under a strict schema (lib/nova/handoff/model.ts): bounded
 * lengths, no unknown field, no markup. The same builders the person's own words use check the content here, so the model
 * hears at once why a request cannot become a card (a secret, an address that is none, a link that is not http(s)).
 * NOVA's conversation only (`surface: 'nova-handoff'`: the environment carries `handoffs`, on a computer and on a phone):
 * ZIGi's panel, browser agents (WebMCP) and the hosted relay never see it.
 */
export const handOffTool: ToolDefinition<HandOffArgs> = {
  name: HAND_OFF_TOOL,
  title: 'Hand-off card',
  description: 'Prepare ONE card the person checks and approves themselves: kind "email" (to, subject, text: a draft for their own mail app), "calendar" (title, date, time), "share" (text, url), "link" (url) or "copy" (text). You cannot send, open, save, share or copy anything: only the person can, with the card’s button. Only when asked; never a secret. Say the card is ready, never that it is done.',
  area: 'today',
  surface: 'nova-handoff',
  parameters: {type: 'object', properties: {
    kind: {type: 'string', enum: HANDOFF_KINDS, description: 'What to prepare.'},
    to: {type: 'string', description: `email: the address or addresses, separated by commas (at most ${MAX_TO}). Only addresses the person gave; leave it out when they gave none.`},
    subject: {type: 'string', description: `email: the subject, one line, at most ${MAX_SUBJECT} characters.`},
    text: {type: 'string', description: `email: the body. calendar: a short note. share or copy: the text. Plain text, at most ${MAX_BODY} characters.`},
    title: {type: 'string', description: `calendar: the event’s name. share: an optional title. One line, at most ${MAX_TITLE} characters.`},
    url: {type: 'string', description: 'link or share: the whole address, starting with https:// or http://.'},
    date: {type: 'string', description: 'calendar: the day, YYYY-MM-DD.'},
    time: {type: 'string', description: 'calendar: the local clock time, HH:MM (leave out for an all-day event).'},
    minutes: {type: 'integer', description: 'calendar: how long, in minutes (5 to 1440; default 60).'},
  }, required: ['kind']},
  args: handOffArgs,
  label: args => `Card · ${CARD_TITLE[args.kind].en}`,
  run(args, env, label) {
    if (!env.handoffs) return refuse(HAND_OFF_TOOL, label, 'area', 'Hand-off cards are part of NOVA’s conversation, which is not open here.');
    // The content is checked now with a fixed clock-free rule set (the day of a calendar file is the model's own argument);
    // the card itself is built again from the same arguments when the reply arrives, under the conversation's own rules.
    const built = handoffFromArgs(args, {now: new Date(0)});
    if (!built.ok) return refuse(HAND_OFF_TOOL, label, 'arguments', built.words);
    return {ok: true, tool: HAND_OFF_TOOL, label, provenance: 'A card for the person to approve, on this device', truncated: null,
      data: {noted: `A ${CARD_TITLE[args.kind].en.toLowerCase()} card will be shown to the person.`, done: false,
        note: 'Nothing was sent, opened, saved, shared or copied, and you cannot do so. Only the person can, with the card’s button. Say the card is ready to check. Never say it is done.'}};
  },
};
export const HAND_OFF_TOOLS = [handOffTool] as const;
