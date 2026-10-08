/**
 * Session X-Local Phase 2 (P2.2b): what a message asks for, read on the device before and after the model replies, in
 * English, Dutch and French. A logging or planning intent that came back without a proposal block gets one bounded
 * repair round (the app and the harness share this rule); a lookup intent lets the question-aware router pre-run the
 * records. Nothing here decides a card's content: it only tells whether a card was asked for at all.
 */
export type Intent = {log: boolean; plan: boolean; lookup: boolean; vague: boolean; refuse: boolean; asks: boolean};
const LOG_VERB = /^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |yeah |right |and |also |oh )*(?:log|record|track|note|noteer|notez?|enregistre|ajoute|add|voeg|mark|tick|coche|vink|skip|sla|saute|put|zet|mets|log it|weight|gewicht|poids|breakfast|lunch|dinner|ontbijt|déjeuner|dîner|snack|supper)\b/i;
const STATEMENT = /^(?:so |um+ |uh+ |ok |okay |yeah |right |today |yesterday |this morning |last night |for lunch |for breakfast |for dinner |vandaag |gisteren |hier |ce matin |aujourd'hui )?(?:i|i've|i have|i just|we|ik|ik heb|j'ai|je|j'|je viens de|on a)\s+(?:ate|eat|had|drank|drink|did|do|ran|run|walked|walk|slept|sleep|weigh|weighed|meditated|read|took|finished|completed|went|was|crashed|napped|heb|ben|woog|weeg|liep|sliep|at|dronk|las|gelezen|gewandeld|geslapen|gemediteerd|gegeten|gedronken|a|ai|suis|pèse|pesais|couché|dormi|mangé|bu|couru|marché|médité|lu|fait)\b/i;
const QUANTITY = /\b\d+(?:[.,]\d+)?\s*(?:kg|kilos?|lbs?|pounds?|g|grams?|gram|ml|millilit\w*|l|litres?|liters?|oz|ounces?|cups?|glasses|glazen|verres?|steps|stappen|pas|minutes?|mins?|minuten|hours?|uur|uren|heures?|kcal|calories|calorieën|km|miles?|reps|push-?ups|pages|pagina's|pagina’s|x)\b/i;
const NUMBER_WORD = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|hundred|half|a couple of|een|twee|drie|vier|vijf|zes|tien|twintig|dertig|honderd|un|une|deux|trois|quatre|cinq|six|dix|vingt|trente|cent)\s+(?:\w+\s+)?(?:kg|kilos?|lbs?|pounds?|grams?|ml|litres?|liters?|oz|cups?|glasses|glazen|verres?|steps|stappen|pas|minutes?|mins?|minuten|hours?|uur|uren|heures?|kcal|calories|km|miles?|reps|push-?ups|pull-?ups|squats|pages|pagina's|pagina’s|eggs|eieren|œufs)\b/i;
const CLOCK = /\b\d{1,2}[:h.]\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b|\bfrom \d{1,2}(?::\d{2})? to \d{1,2}|\bvan \d{1,2}(?::\d{2})? tot \d{1,2}|\bde \d{1,2}h/i;
const PLAN = /\b(?:plan|planning|create|make|new habit|a habit|habit:|nieuwe gewoonte|gewoonte|habitude|goal|doel|objectif|remind|reminder|herinner|rappel|challenge|uitdaging|défi|stack|stapel|enchaîne|\w*widgets?|link|lien|milestone|mijlpaal|jalon|intention|intentie|remember|onthoud|retiens|recipe|recept|recette|grocer|boodschappen|courses|meal|maaltijd|repas|fast|vasten|jeûne|mood|humeur|stemming)\b/i;
const LOOKUP = /\b(?:how (?:many|much|far|long|often|close|did|is|are|was|were)|what(?:'s| is| was| were| did| do| have)?|which|when|total|did i|do i|have i|am i|did my|does my|do my|is my|are my|was my|were my|has my|have my|is there|average|avg|longest|best|streak|show|compare|hoeveel|hoe (?:vaak|lang|ver|is|was|heb|ben|gaat)|wat (?:is|was|heb|staat)|welke|wanneer|combien|quel(?:le)?s?|où en|quand|comment|est-ce que|ai-je|suis-je)\b/i;
const QUESTION = /\?\s*$/;
/** One or two words with nothing to log or plan from ("Log it", "Add a habit", "Change my goal"): a clarifying question is the right reply. */
const VAGUE = /^(?:log it|note that|track this|skip it|mark it done|remind me|add a habit|change my goal|a goal for \d+|put that on today|the same as yesterday|log my weight|remind me to \w+|noteer het|note-le|voeg een gewoonte toe|change mon objectif|water)\s*[.!]?$/i;
/**
 * Phase 2 P2.3 (found by the first after-run): asks ZIGi has no card for and must decline — deleting or archiving a record,
 * moving money (buying, selling, funding, signing, staking, claiming, transfers) and keeping a secret (a key, a password).
 * No repair round may push a proposal there: a refusal is the right reply, and a second ask with the schema was turning
 * correct refusals into invented cards. Verbs at the start of the ask, or the secret cues anywhere; a noun ("the Emergency
 * fund goal") does not count.
 */
const REFUSE = /^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |now |then |alors |dan |nu )*(?:delete|remove|erase|wipe|drop|archive|discard|buy|sell|trade|swap|fund|transfer|send|move|withdraw|deposit|stake|unstake|claim|sign|verwijder|wis|archiveer|koop|verkoop|stort|verstuur|verplaats|teken|supprime[rz]?|efface[rz]?|retire[rz]?|archive[rz]?|ach[eè]te[rz]?|vends?|vendre|finance[rz]?|transf[eè]re[rz]?|signe[rz]?|retire[rz]?)\b|\b(?:remember|save|store|keep|onthoud|bewaar|retiens|garde|enregistre)\b.{0,40}\b(?:key|password|passphrase|secret|seed|sleutel|wachtwoord|cl[eé]|mot de passe)\b|\bmy (?:password|api key|seed phrase|private key) is\b|\bmijn wachtwoord is\b|\bmon mot de passe est\b|\bsk-[A-Za-z0-9]/i;
/** A reply that reads as a decline, in the three languages: no repair round after it (the model said no; a card would be invented). */
/**
 * The reply declined (the repair round never asks again after a decline, and a money ask's decline carries no card: round 9,
 * ADR-017 S75). One cue for the app and the scorer (`REFUSAL` in evals/score.ts is this regex), widened in S70 for "I do not
 * sign", "I will not", "have no ability", "only you can" and the Dutch and French forms.
 */
export const REFUSAL_REPLY = /\b(?:can(?:'|’)?t|cannot|won(?:'|’)?t|will not|never (?:move|sign|sell|buy|trade|delete|store|keep|give)|not able to|unable to|(?:do|does|don(?:'|’)?t|doesn(?:'|’)?t) (?:not )?(?:do|give|move|sign|hold|execute|sell|buy|trade|approve|connect|delete|remove|erase|store|keep|convert|send|transfer|support|offer|provide|have the ability|have a way)|(?:have|has) no (?:ability|way)|only you can|no (?:medical|dietary|financial|investment|tax) advice|not (?:something|able|allowed|possible|supported)|ik kan (?:dat|dit|het|geen|niet|het niet|dat niet|dit niet)|kan ik niet|doe ik niet|je ne peux pas|je ne (?:fais|signe|vends|achète|supprime|stocke) pas|impossible)\b/i;
/** A message that asks (a question word first, a question mark last) asks; it logs or plans nothing, whatever quantities it names ("How can I lose 10 kg in 2 weeks?"). */
const QUESTION_START = /^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |zigi,? |hé |hoi |salut |dis-moi,? )*(?:how|what|which|when|where|why|who|can|could|should|would|will|is|are|do|does|did|have|has|am|hoe|wat|welke?|wanneer|waar|waarom|kan|kun|kunnen|moet|zou|is|zijn|heb|hebben|comment|quoi|que|quel(?:le)?s?|quand|où|pourquoi|est-ce|puis-je|peux-tu|dois-je|y a-t-il)\b/i;
export function detectIntent(text: string): Intent {
  const t = text.trim();
  const vague = VAGUE.test(t), refuse = REFUSE.test(t), asks = QUESTION.test(t) && QUESTION_START.test(t);
  const lookup = !vague && LOOKUP.test(t) && (QUESTION.test(t) || !LOG_VERB.test(t)) && !STATEMENT.test(t);
  const log = !vague && !lookup && (LOG_VERB.test(t) || STATEMENT.test(t) || ((QUANTITY.test(t) || NUMBER_WORD.test(t)) && !PLAN.test(t)) || (CLOCK.test(t) && /\b(slept|sleep|bed|nap|geslapen|dormi|couché)\b/i.test(t)));
  const plan = !vague && !lookup && !log && PLAN.test(t) && !QUESTION.test(t);
  return {log: log && !refuse && !asks, plan: plan && !refuse && !asks, lookup, vague, refuse, asks};
}
/** Whether a reply with no proposal block should get the bounded repair round: a log or plan intent, nothing to refuse, and the reply neither asked a question back nor declined. */
export const wantsCard = (intent: Intent, reply: string): boolean => (intent.log || intent.plan) && !intent.vague && !intent.refuse && !/\?/.test(reply.trim().slice(-200)) && !REFUSAL_REPLY.test(reply.slice(0, 400));
/**
 * Whether refused blocks alone may trigger the repair round: the model tried to log or plan and got the shape wrong, which
 * is the retry's purpose ("a lot of water" in log mode, no amount) — unless the ask was a lookup, a question, something
 * ZIGi declines, or the reply itself declined (there a stray block is dropped and the words stand, ADR-017 S59).
 */
export const refusedBlocksMayRepair = (intent: Intent, reply: string): boolean => !intent.lookup && !intent.asks && !intent.refuse && !REFUSAL_REPLY.test(reply.slice(0, 400));

