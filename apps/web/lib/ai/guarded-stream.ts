import {streamChat} from './chat';
import {guardRequest} from './privacy-mode';

/**
 * Session AK security review Z1A-1 (lane ZF): the one way a single-request path (a label, lab-sheet or receipt photo) reaches
 * the person's model. Every request goes through the privacy mode's engine hook first (lib/ai/privacy-mode.ts
 * `guardRequest`): Strict keeps it on this computer (a cloud model is refused before anything is sent), Guarded never sends
 * a photo to a cloud model (GUARDED_PHOTO_REFUSAL), and recovery words in the system text are hidden. A refusal arrives as
 * an AiError('blocked') whose message is the plain "Not sent: …" line the caller shows. lib/ai/guarded-stream.test.ts fails
 * when a file reaches `streamChat` without this hook.
 */
export const guardedStreamChat: typeof streamChat = request => (async function* () { yield* streamChat(await guardRequest(request)); })();
