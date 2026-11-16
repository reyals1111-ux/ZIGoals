/**
 * Session AM (ADR-038 D19): "Show again" — a request's widgets are made again on the stage. A widget body or a side bar
 * asks with this event; NOVA's dashboard (the stage's owner) answers it. Nothing travels: the event names a request's id.
 */
export const STAGE_AGAIN_EVENT = 'zigoals:nova-stage-again';
export function showAgain(askId: string): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<string>(STAGE_AGAIN_EVENT, {detail: askId}));
}
