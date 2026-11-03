/**
 * Security review Z1A-2 (lane ZF): when a reply may be driven by words the person did not type here, none of its cards is
 * auto-accepted (they still show, to confirm by a tap, with Undo). One rule for ZIGi and NOVA:
 * - a lookup whose result holds words someone else may have written (notes, imported calendars, the journal) makes the
 *   reply untrusted on every surface;
 * - on NOVA's surface every lookup does (the simplest safe rule: a tool result is record text, never the person's ask), and
 *   so do NOVA's pack holding notes or journal lines, a task answered by the person's own agent (Hermes reads the web and
 *   mail), and a message that came (at least partly) from a paste;
 * - records attached to a question ("Ask my AI for more") count like the lookups that made them.
 * ZIGi's own page records attached without a lookup are the person's own entries and keep today's behaviour.
 */
export const UNTRUSTED_RESULT_TOOLS: ReadonlySet<string> = new Set(['search_notes', 'calendar_events', 'journal']);
export const isUntrustedTool = (tool: string): boolean => UNTRUSTED_RESULT_TOOLS.has(tool);
export type TurnInputs = {
  /** The send came from NOVA's surface (its own message, or a task it handed to ZIGi or an agent). */ nova: boolean;
  /** NOVA's pack held notes or journal lines. */ packUntrusted?: boolean;
  /** Pasted or imported words in the message. */ pasted?: boolean;
  /** The person's own agent (Hermes) answered. */ agent?: boolean;
  /** The tools the model looked up in this turn (their names). */ lookups?: readonly string[];
  /** Records attached with the question came from an untrusted lookup. */ extraUntrusted?: boolean};
export function replyUntrusted(inputs: TurnInputs): boolean {
  const lookups = inputs.lookups ?? [];
  if (inputs.pasted || inputs.extraUntrusted || lookups.some(isUntrustedTool)) return true;
  return inputs.nova && (!!inputs.packUntrusted || !!inputs.agent || lookups.length > 0);
}
