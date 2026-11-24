import {levelLabel} from '../../chess/engine/levels';
import {tallyOf, totalTally, type ChessComputer, type Tally} from '../../chess/computer-record';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, isQuestion, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (roadmap; Todoist, Lichess): NOVA's and ZIGi's on-device answers, in English and Dutch, to what the
 * roadmap builder's features hold — games against ZIGoals' own chess engine (the results by level, a game waiting to be
 * continued) and photos and voice notes on tasks (kept in this browser only, so the answer says where they are and, when
 * the page passes their count, how many). Under the Today switch, like chess and tasks. The chess record comes in `extra`
 * (or the env's `nova.chessComputer` once the lead adds it); without it the answer says where the games are.
 */
export type Av2RoadmapExtra = {chess?: ChessComputer | null; /** How many photos and voice notes the tasks carry (read from IndexedDB by the caller), when known. */ attachments?: {photos: number; voice: number; tasks: number} | null};
type Ask = Asked & {extra: Av2RoadmapExtra};
const CHESS = [{tool: 'chess', args: {}, label: 'Chess'}], TASKS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
const results = (t: Tally, lang: Lang) => say(lang, `${t.won} won, ${t.lost} lost, ${t.drawn} drawn`, `${t.won} gewonnen, ${t.lost} verloren, ${t.drawn} remise`);

export function av2RoadmapAnswer(question: string, env: ToolEnv, extra: Av2RoadmapExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {chessComputer?: ChessComputer | null}) | null | undefined;
  const ask: Ask = {...a, extra: {chess: extra.chess ?? nova?.chessComputer ?? null, attachments: extra.attachments ?? null}};
  for (const one of [chessGame, chessResults, taskAttachments]) { const r = one(ask); if (r) return r; }
  return null;
}

const aboutComputer = (f: string) => /\bchess\b.*\b(?:computer|engine|bot)\b|\b(?:computer|engine|bot)\b.*\bchess\b/.test(f) || /\bschaak(?:computer|engine)\b|\bschaak\w*\b.*\b(?:computer|engine)\b|\b(?:computer|engine)\b.*\bschaak\w*\b/.test(f);

/** "do I have a chess game in progress against the computer", "heb ik nog een schaakpartij tegen de computer open". */
function chessGame(a: Ask): LocalReply | null {
  const en = /\bchess\b.*\b(?:in progress|unfinished|waiting|open|paused|going)\b|\b(?:unfinished|open|current) (?:chess )?game\b.*\bchess\b/.test(a.f);
  const nl = /\bschaak(?:partij|spel)?\b.*\b(?:open|bezig|lopend|onaf|wacht)\b|\b(?:lopende|open) schaakpartij\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today', 'chess'); if (shut) return shut;
  const game = a.extra.chess?.game;
  if (!game) return answer(say(a.lang, 'No game against the computer is waiting. Start one in Chess → Play: it is kept on this device, so you can come back to it.', 'Er wacht geen partij tegen de computer. Begin er een in Chess → Play: hij blijft op dit apparaat bewaard, zodat je later verder kunt.'), CHESS);
  const moves = Math.ceil(game.moves.length / 2), side = game.side === 'w' ? say(a.lang, 'White', 'wit') : say(a.lang, 'Black', 'zwart');
  return answer(say(a.lang, `Yes: you play ${side} against ${levelLabel(game.level)}, ${count(moves, 'en', ['move', 'moves'], ['', ''])} in. Continue it in Chess → Play.`, `Ja: je speelt ${side} tegen ${levelLabel(game.level)}, ${count(moves, 'nl', ['', ''], ['zet', 'zetten'])} ver. Ga verder in Chess → Play.`), CHESS);
}
/** "how many chess games have I won against the computer", "hoeveel schaakpartijen heb ik gewonnen tegen de computer". */
function chessResults(a: Ask): LocalReply | null {
  const en = aboutComputer(a.f) && /\b(?:won|win|wins|lost|results?|record|score|how many|games?)\b/.test(a.f);
  const nl = aboutComputer(a.f) && /\b(?:gewonnen|winst|verloren|resultaten?|hoeveel|partijen)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today', 'chess'); if (shut) return shut;
  const r = a.extra.chess, total = r ? totalTally(r) : {won: 0, lost: 0, drawn: 0};
  if (!total.won && !total.lost && !total.drawn) return answer(say(a.lang, 'No finished games against the computer yet. Chess → Play has ZIGoals’ own engine at three levels (Easy, Medium, Hard), on this device.', 'Nog geen uitgespeelde partijen tegen de computer. Chess → Play heeft de eigen schaakengine van ZIGoals op drie niveaus (Easy, Medium, Hard), op dit apparaat.'), CHESS);
  const lines = (['easy', 'medium', 'hard'] as const).map(l => [l, tallyOf(r!, l)] as const).filter(([, t]) => t.won + t.lost + t.drawn > 0).map(([l, t]) => `• ${levelLabel(l)}: ${results(t, a.lang)}`);
  return answer([say(a.lang, `Against the computer: ${results(total, 'en')}.`, `Tegen de computer: ${results(total, 'nl')}.`), ...lines].join('\n'), CHESS);
}
/** "can I add a photo to a task", "can I record a voice note on a task", "kan ik een foto aan een taak toevoegen". */
function taskAttachments(a: Ask): LocalReply | null {
  const en = /\b(?:photos?|pictures?|images?|voice (?:notes?|memos?)|recordings?|attachments?|attach)\b.*\btasks?\b|\btasks?\b.*\b(?:photos?|pictures?|voice (?:notes?|memos?)|attachments?)\b/.test(a.f);
  const nl = /\b(?:foto'?s?|afbeeldingen?|spraakmemo'?s?|spraaknotities?|opnames?|bijlagen?)\b.*\b(?:taak|taken)\b|\b(?:taak|taken)\b.*\b(?:foto'?s?|spraakmemo'?s?|spraaknotities?|bijlagen?)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const n = a.extra.attachments;
  const how = say(a.lang, 'Open a task and use Photos and voice notes: add a photo, or record a voice note of up to a minute. They stay in this browser only, never uploaded or synced; Export everything includes them as files.',
    'Open een taak en gebruik Photos and voice notes: voeg een foto toe, neem een spraakmemo op van hooguit een minuut. Ze blijven alleen in deze browser, nooit geüpload en nooit gesynchroniseerd; Export everything neemt ze mee als bestanden.');
  // Review b1 #17: a count asked for with no count at hand (the photos live in this browser's own store, which the answer
  // is not given) says so and where to look, instead of only how to add one.
  if (!n && /\bhow many\b|\bhoeveel\b/.test(a.f)) return answer(say(a.lang, `I can’t count them from here: a task’s photos and voice notes stay in this browser’s own store, which I don’t read. Open a task to see its Photos and voice notes. ${how}`,
    `Ik kan ze hier niet tellen: de foto’s en spraakmemo’s van een taak blijven in de eigen opslag van deze browser, die ik niet lees. Open een taak om zijn Photos and voice notes te zien. ${how}`), TASKS);
  // Session AV lane 2 (loose ends): a count read and found empty is said as none, not as how-to alone.
  if (n && !n.photos && !n.voice && /\bhow many\b|\bhoeveel\b/.test(a.f)) return answer(say(a.lang, `No photo or voice note is on your tasks in this browser yet. ${how}`, `Er staat in deze browser nog geen foto of spraakmemo bij je taken. ${how}`), TASKS);
  if (!n || (!n.photos && !n.voice)) return answer(how, TASKS);
  return answer(say(a.lang, `${count(n.photos, 'en', ['photo', 'photos'], ['', ''])} and ${count(n.voice, 'en', ['voice note', 'voice notes'], ['', ''])} on ${count(n.tasks, 'en', ['task', 'tasks'], ['', ''])}, in this browser. ${how}`,
    `${count(n.photos, 'nl', ['', ''], ['foto', "foto's"])} en ${count(n.voice, 'nl', ['', ''], ['spraakmemo', "spraakmemo's"])} bij ${count(n.tasks, 'nl', ['', ''], ['taak', 'taken'])}, in deze browser. ${how}`), TASKS);
}
