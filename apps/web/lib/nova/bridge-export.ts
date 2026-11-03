import {parseReply} from '../ai/actions/parse';
import type {Chat} from '../ai/chats';
import {AREA_LABELS} from '../ai/context/pages';
import {stripHint} from '../ai/emotion-hint';
import {localDate} from '../local-date';
import {formatDateTime} from '../visual-format';
import type {ChatOrigin, DelegatedTurn} from './bridge';

/**
 * "Export as Markdown" (Session AK, NOVA chat): one conversation as a Markdown file, made on the device and saved by the
 * browser as a download; nothing is sent. Each turn says who spoke (you, NOVA under the person's name for it, ZIGi on a
 * page task, or an answer made on the device with no AI) and when. Proposal cards are not copied as code: their count is
 * one line, since a card only ever means something inside the app. Times use the app's date helpers.
 */
export type ExportInput = {chat: Chat; origin: ChatOrigin; delegated: Readonly<Record<string, DelegatedTurn>>; persona: string; now?: Date; timeZone?: string};
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
export function chatMarkdown({chat, origin, delegated, persona, now = new Date(), timeZone}: ExportInput): string {
  const name = oneLine(persona) || 'NOVA', when = (at: string | Date) => formatDateTime(at, timeZone ? {timeZone} : {});
  const started = origin.by === 'nova' ? `started in ${name}` : `started with ZIGi${origin.area ? ` on ${AREA_LABELS[origin.area]}` : ''}`;
  const lines = [`# ${oneLine(chat.title) || 'Chat'}`, '', `_Exported from ZIGoals on ${when(now)} · ${started}${chat.model ? ` · last model: ${oneLine(chat.model)}` : ''}._`, '_This file holds your own conversation, made on your device. It is not encrypted._', ''];
  for (const turn of chat.turns) {
    const mark = delegated[turn.id];
    let who: string;
    const hermes = mark?.agent === 'hermes';
    if (turn.role === 'user') who = mark?.role === 'task' ? (hermes ? `You, handed to your Hermes Agent with ${AREA_LABELS[mark.area]}` : `You, handed to ZIGi on ${AREA_LABELS[mark.area]}`) : 'You';
    else if (turn.source === 'local' || turn.source === 'on-device') who = `${mark ? 'ZIGi' : origin.by === 'nova' ? name : 'ZIGi'} · on your device, no AI`;
    else who = hermes ? 'Hermes · your agent' : mark ? `ZIGi · ${AREA_LABELS[mark.area]} page` : origin.by === 'nova' ? name : 'ZIGi';
    const parsed = turn.role === 'assistant' ? parseReply(stripHint(turn.text)) : null;
    const text = (parsed ? parsed.text : turn.text).trim();
    lines.push(`**${who}** · ${when(turn.at)}`, '', text || '_(no words)_');
    if (parsed && parsed.proposals.length) lines.push('', `_${parsed.proposals.length === 1 ? 'One proposed change' : `${parsed.proposals.length} proposed changes`} (a card in the app; saved only when added there)._`);
    if (turn.stopped) lines.push('', `_${oneLine(turn.stopped)}_`);
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
/** A file name for the download: the day and the first words of the title, letters and digits only. */
export function chatFileName(chat: Pick<Chat, 'title'>, now = new Date()): string {
  const slug = chat.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return `zigoals-chat-${localDate(now)}${slug ? `-${slug}` : ''}.md`;
}
