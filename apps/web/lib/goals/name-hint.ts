/** Session AU (ADR-044 F-6): which goal kind a name suggests, if any (EN and NL words; money words never suggest one). */
export function goalNameHint(name:string):'average'|'count'|null{
 const n=name.toLowerCase();if(!n.trim()||/[€$]|\b(eur|usd|euro|dollar|save|sparen|savings?|fund|fonds|buffer)\b/.test(n))return null;
 if(/\b(sleep|slaap|slapen|steps?|stappen|water|screen ?time|schermtijd|hours? (of )?sleep|uur)\b/.test(n))return 'average';
 if(/\b(books?|boeken|boek|pages?|pagina'?s|km|kilomet(er|re)s?|miles?|runs?|workouts?|lessons?|lessen|courses?|chapters?|hoofdstukken|marathons?)\b/.test(n))return 'count';
 return null;
}
/** Friend-readiness (FR-S-12): "Keep an average instead →" carries the name already typed, so it is not typed again. */
/** The average goal form's address. Never carries the person's words: a URL reaches the server (Next prefetches and
 *  fetches it), and a goal's name is private (public-alpha's sentinel check). */
export const AVERAGE_NEW = '/app/goals/average/new';
let handedName: string | null = null;
/** Friend-readiness (FR-S-12): "Keep an average instead →" hands the name already typed to the average form, in this
 *  page's memory only (a client navigation keeps it; a reload or a new tab starts empty). Nothing is stored or sent. */
export function handOffName(name: string): void { const n = name.replace(/\s+/g, ' ').trim().slice(0, 120); handedName = n || null; }
/** The handed name, read while the form starts (read again by a strict-mode second render: it is not cleared here). */
export function peekHandedName(): string | undefined { return handedName ?? undefined; }
/** The form, once it has started, clears it: the next form opened opens empty. */
export function clearHandedName(): void { handedName = null; }
