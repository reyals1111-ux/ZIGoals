import type {ZigiEvent} from '../../components/zigi/bus';
import type {LocalReply} from './local-answers/engine';
import {detectRisk} from './safety';

/**
 * How ZIGi looks after a local answer (Session V Part 12): pleased with an answer, curious when the question needs the
 * person's choice, puzzled by a question it cannot answer here, gentle after words that touch a sensitive topic.
 */
export function localEvent(reply: LocalReply, question: string): ZigiEvent {
  if (detectRisk(question)) return 'careful';
  return reply.kind === 'answer' ? 'local-answer' : reply.kind === 'choices' ? 'ambiguity' : reply.kind === 'examples' ? 'not-understood' : 'reply-done';
}
