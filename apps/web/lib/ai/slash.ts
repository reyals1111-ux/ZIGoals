/**
 * Slash commands in ZIGi's composer (Session V Part 10): a short word after "/" picks what the message does. Typed
 * "/" opens a list of them (filtered as the person types); each is explained in Help. Nothing new is possible through
 * a command: /log and /plan only ask the person's AI for proposal cards, /remember only proposes a note card, /ask
 * skips ZIGi's on-device answer for one message, and the rest open a view of ZIGi or a page.
 */
export type SlashName = '/log' | '/ask' | '/plan' | '/review' | '/pack' | '/insights' | '/remember' | '/help';
export type SlashCommand = {name: SlashName; hint: string; takesText: boolean};
export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {name: '/log', hint: 'Log what you did, ate or drank; ZIGi proposes cards', takesText: true},
  {name: '/ask', hint: 'Ask your AI directly, even when ZIGi could answer here', takesText: true},
  {name: '/plan', hint: 'Plan a goal or a habit with your AI, as cards you confirm', takesText: true},
  {name: '/review', hint: 'Go through your week, on this device', takesText: false},
  {name: '/pack', hint: 'Make a context pack for your AI, in Settings', takesText: false},
  {name: '/insights', hint: 'Patterns in your records, on this device', takesText: false},
  {name: '/remember', hint: 'Keep a note in What ZIGi knows about me, after you confirm it', takesText: true},
  {name: '/help', hint: 'What ZIGi can do, and these commands', takesText: false},
];
const BY_NAME = new Map(SLASH_COMMANDS.map(c => [c.name, c]));
/** A message that starts with a known command, and the words after it; null for any other message. */
export function parseSlash(text: string): {command: SlashCommand; rest: string} | null {
  const match = /^\s*(\/[a-z]+)(?:\s+([\s\S]*))?$/i.exec(text);
  const command = match ? BY_NAME.get(match[1]!.toLowerCase() as SlashName) : undefined;
  return command ? {command, rest: (match![2] ?? '').trim()} : null;
}
/** The commands the list offers while the person types the first word after "/" (nothing once a space follows). */
export function suggestCommands(text: string): SlashCommand[] {
  if (!/^\/[a-z]*$/i.test(text)) return [];
  const typed = text.toLowerCase();
  return SLASH_COMMANDS.filter(c => c.name.startsWith(typed));
}
/** What /plan adds to the system prompt for that one message: proposal cards only, never a write. */
export const PLAN_NOTE = 'The person wants to plan a goal or a habit. Ask at most one short question if something essential is missing; otherwise propose it as a plan-goal or build-habit card (several small cards are fine). Nothing is written until they confirm.';
/** The words /help shows, on the device. */
export function helpText(): string {
  return ['ZIGi answers questions about your records here, and with your own AI connected it can answer more and propose cards you confirm. Commands:', ...SLASH_COMMANDS.map(c => `${c.name}: ${c.hint}.`), 'Press ? (outside the message box) for keyboard shortcuts. More in Help → ZIGi.'].join('\n');
}
