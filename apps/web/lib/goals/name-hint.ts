/** Session AU (ADR-044 F-6): which goal kind a name suggests, if any (EN and NL words; money words never suggest one). */
export function goalNameHint(name:string):'average'|'count'|null{
 const n=name.toLowerCase();if(!n.trim()||/[€$]|\b(eur|usd|euro|dollar|save|sparen|savings?|fund|fonds|buffer)\b/.test(n))return null;
 if(/\b(sleep|slaap|slapen|steps?|stappen|water|screen ?time|schermtijd|hours? (of )?sleep|uur)\b/.test(n))return 'average';
 if(/\b(books?|boeken|boek|pages?|pagina'?s|km|kilomet(er|re)s?|miles?|runs?|workouts?|lessons?|lessen|courses?|chapters?|hoofdstukken|marathons?)\b/.test(n))return 'count';
 return null;
}
/** Friend-readiness (FR-S-12): "Keep an average instead →" carries the name already typed, so it is not typed again. */
export const averageHref=(name:string)=>{const n=name.replace(/\s+/g,' ').trim().slice(0,120);return n?`/app/goals/average/new?name=${encodeURIComponent(n)}`:'/app/goals/average/new';};
