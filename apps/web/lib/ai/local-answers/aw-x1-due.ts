import {TIMERS, activeTimers, secondsLeft, timerState, type Timer, type Timers} from '../../timers/store';
import {NOTIFY_PREFS, taskAgainOf} from '../../notify/prefs';
import {readDeviceRecord} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import type {Again} from '../../tasks/remind-again';
import {ownSnoozes, snoozeLabel} from '../../tasks/snooze-choices';
import {wallClock} from '../../zone-time';
import type {TaskPlan} from '../../tasks/plan-record';
import {fold} from './exact/text';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AW (X1, LEDGER #438–#440; Due): NOVA's and ZIGi's on-device answers, in English and Dutch, to what round 7's
 * "Due" rows hold — the named timers running now and when one ends ("when does my pasta timer end"), and how reminders
 * remind again and which snooze choices are offered. They read this device's records (`extra`, which the engine reads
 * from the app storage) under the Today switch (Tasks); an answer never starts, stops or changes anything.
 */
export type AwX1Extra = {timers?: Timers | null; taskAgain?: Again | null; snoozes?: unknown};
type Ask = Asked & AwX1Extra & {now: number; zone: string};
const CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
/** What the engine passes: this device's timers (null when unreadable) and reminder choices; nothing on the server. */
export function readAwX1Extra(): AwX1Extra {
  if (typeof window === 'undefined') return {};
  try {
    const storage = getAppStorage(), timers = readDeviceRecord(storage, TIMERS), prefs = readDeviceRecord(storage, NOTIFY_PREFS).data;
    return {timers: timers.unreadable ? null : timers.data, taskAgain: taskAgainOf(prefs), snoozes: prefs.snoozes};
  } catch { return {}; }
}

export function awX1Answer(question: string, env: ToolEnv, extra: AwX1Extra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  // The timers come from this device (the engine reads them) or, where a caller carries them, NOVA's sources.
  const fromNova = (env.nova as {timers?: Timers | null} | null | undefined)?.timers;
  // Session AW (integration): the assistant's own sources carry the timers and the notification choices, as every other
  // answer reads its records (env.ak); this device's storage is read only where a caller has no sources.
  const ak = env.ak as {timers?: unknown; notifyPrefs?: unknown} | null | undefined;
  const akTimers = ak && 'timers' in ak ? (ak.timers == null ? null : TIMERS.schema.safeParse(ak.timers).data ?? null) : undefined;
  const akPrefs = ak && ak.notifyPrefs != null ? NOTIFY_PREFS.schema.safeParse(ak.notifyPrefs).data : undefined;
  // What a caller hands over (this device's storage in the browser, a test's fixture) comes first.
  const own = Object.keys(extra).length ? extra : akTimers !== undefined || akPrefs ? {timers: akTimers, ...(akPrefs ? {taskAgain: taskAgainOf(akPrefs), snoozes: akPrefs.snoozes} : {})} : extra;
  const ask: Ask = {...a, ...own, timers: own.timers !== undefined ? own.timers : fromNova, now: env.now.getTime(), zone: env.habitZone || 'UTC'};
  for (const one of [timerEndAnswer, timersAnswer, againAnswer, snoozeAnswer]) { const r = one(ask); if (r) return r; }
  return null;
}
const minutesWords = (a: Ask, seconds: number) => seconds < 60 ? say(a.lang, 'under a minute', 'minder dan een minuut') : `${Math.ceil(seconds / 60)} min`;
function line(a: Ask, t: Timer): string {
  const s = timerState(t, a.now), left = secondsLeft(t, a.now), name = clean(t.name, 40);
  if (s === 'ended') return `• ${name}: ${say(a.lang, 'done', 'klaar')}`;
  if (s === 'paused') return `• ${name}: ${say(a.lang, `paused, ${minutesWords(a, left)} left`, `gepauzeerd, nog ${minutesWords(a, left)}`)}`;
  const end = clockIn(a.lang, wallClock(t.endsAt!, a.zone).clock);
  return `• ${name}: ${say(a.lang, `${minutesWords(a, left)} left (ends at ${end})`, `nog ${minutesWords(a, left)} (klaar om ${end})`)}`;
}
const NONE = (a: Ask) => say(a.lang, 'No timer is running. Open Timers (Tasks → More views → Timers, or the command menu) and start one by name — “Pasta”, 9 minutes; several can run at once, and each is kept to start again.',
  'Er loopt geen timer. Open Timers (Tasks → More views → Timers, of het opdrachtmenu) en start er een met een naam — “Pasta”, 9 minuten; er kunnen er meerdere tegelijk lopen, en elke timer blijft bewaard om opnieuw te starten.');
function timersOf(a: Ask): {timers: Timers} | {reply: LocalReply} | null {
  const shut = closed(a.env, 'today'); if (shut) return {reply: shut};
  if (a.timers === undefined) return null;
  if (!a.timers) return {reply: answer(say(a.lang, 'Your timers can’t be read on this device right now, so I can’t say.', 'Je timers kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), CALLS)};
  return {timers: a.timers};
}

/** "what timers are running", "how long is left on my timers", "welke timers lopen er" (LEDGER #440). */
function timersAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:what|which|any) timers?\b.*\b(?:running|on|going|set)\b|\bhow (?:long|much time) (?:is )?left on (?:my |the )?timers?\b|\bmy timers\b|\btimers? (?:are |is )?running\b/.test(a.f);
  const nl = /\bwelke timers?\b|\btimers? (?:lopen|loopt|staan|staat) (?:er )?(?:nu )?(?:aan)?\b|\bhoeveel tijd (?:heeft|hebben) (?:mijn |de )?timers?\b|\bmijn timers\b|\blopen er (?:nu )?timers\b|\bloopt er (?:een )?timer\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = timersOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const live = activeTimers(got.timers, a.now), timed = taskTimers(a);
  if (!live.length && !timed.length) return answer(say(a.lang, `${NONE(a)} A task can also be timed in Tasks → Today; none is now.`, `${NONE(a)} Een taak kun je ook timen in Tasks → Today; er loopt er nu geen.`), CALLS);
  const parts = live.length ? [say(a.lang, `${count(live.length, 'en', ['timer is', 'timers are'], ['', ''])} on:`, `${count(live.length, 'nl', ['', ''], ['timer staat', 'timers staan'])} aan:`), ...live.slice(0, 10).map(t => line(a, t))] : [];
  // A question about "timers" covers the tasks being timed too (Tasks → Today), the answer round 6 gave on its own.
  if (timed.length) parts.push(say(a.lang, `Tasks being timed (${timed.length}):`, `Taken die getimed worden (${timed.length}):`), ...timed.slice(0, 8));
  return answer(parts.join('\n'), CALLS);
}
/** The tasks being timed in Tasks → Today (the planning record's count-up timers), each with its minutes so far. */
function taskTimers(a: Ask): string[] {
  const nova = a.env.nova as (typeof a.env.nova & {taskPlan?: TaskPlan | null}) | null | undefined, tasks = nova?.tasks?.tasks ?? [];
  return (nova?.taskPlan?.timers ?? []).flatMap(t => { const task = tasks.find(x => x.id === t.taskId); if (!task) return []; const m = Math.max(1, Math.round((a.now - t.since) / 60_000)); return [`• ${clean(task.title, 60)}: ${say(a.lang, `${m} min so far`, `${m} min tot nu`)}`]; });
}
/** "when does my pasta timer end", "wanneer is mijn pastatimer klaar", "wanneer gaat de timer van de was af" (LEDGER #440). */
function timerEndAnswer(a: Ask): LocalReply | null {
  const en = /\bwhen (?:does|will|is) (?:my |the )?(.{1,40}?) ?timer (?:end|be done|done|go off|finish|ring|over)\b/.exec(a.f)
    ?? /\bhow (?:long|much time) (?:is )?left on (?:my |the )(.{1,40}?) ?timer\b/.exec(a.f);
  const nl = /\bwanneer (?:is|gaat|loopt|stopt) (?:mijn |de )?(\S{1,40}?)timer (?:klaar|af|om|op)\b/.exec(a.f)
    ?? /\bwanneer (?:is|gaat|loopt|stopt) (?:mijn |de )?timer (?:van|voor) (?:de |het |mijn )?(.{1,40}?) (?:klaar|af|om)\b/.exec(a.f)
    ?? /\bhoeveel tijd heeft (?:mijn |de )?(\S{1,40}?)timer\b/.exec(a.f);
  const wanted = (en ?? nl)?.[1]?.trim();
  if (wanted === undefined) return null;
  const got = timersOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const key = fold(wanted), all = got.timers.timers;
  const found = key ? all.filter(t => fold(t.name).includes(key) || key.includes(fold(t.name).replace(/\s*\(showcase\)$/, ''))) : activeTimers(got.timers, a.now);
  const t = found.sort((x, y) => (timerState(y, a.now) === 'running' ? 1 : 0) - (timerState(x, a.now) === 'running' ? 1 : 0))[0];
  if (!t) {
    const live = activeTimers(got.timers, a.now);
    return answer(live.length ? [say(a.lang, `I can’t find a timer called “${clean(wanted, 40)}”. Running now:`, `Ik vind geen timer die “${clean(wanted, 40)}” heet. Nu aan:`), ...live.slice(0, 6).map(x => line(a, x))].join('\n') : NONE(a), CALLS);
  }
  const name = clean(t.name, 40), s = timerState(t, a.now), left = secondsLeft(t, a.now);
  if (s === 'running') { const end = clockIn(a.lang, wallClock(t.endsAt!, a.zone).clock); return answer(say(a.lang, `Your ${name} timer ends at ${end}, in ${minutesWords(a, left)}.`, `Je timer ${name} is klaar om ${end}, over ${minutesWords(a, left)}.`), CALLS); }
  if (s === 'paused') return answer(say(a.lang, `Your ${name} timer is paused with ${minutesWords(a, left)} left; it ends that long after you resume it.`, `Je timer ${name} staat op pauze met nog ${minutesWords(a, left)}; hij is zo lang na hervatten klaar.`), CALLS);
  if (s === 'ended') return answer(say(a.lang, `Your ${name} timer is done (it ended at ${clockIn('en', wallClock(t.endsAt!, a.zone).clock)}). Stop it in the timers strip, or add a minute.`, `Je timer ${name} is klaar (om ${wallClock(t.endsAt!, a.zone).clock}). Stop hem in de timerbalk, of voeg een minuut toe.`), CALLS);
  return answer(say(a.lang, `Your ${name} timer isn’t running. Start it again in Timers (Tasks → More views → Timers).`, `Je timer ${name} loopt niet. Start hem opnieuw in Timers (Tasks → More views → Timers).`), CALLS);
}
/** "how do I make a reminder repeat until done", "hoe laat ik een herinnering herhalen tot het klaar is" (LEDGER #438). */
function againAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:remind|reminders?)\b.*\b(?:again|repeat|repeats|keep reminding|until (?:it is |its )?done|nag)\b|\bkeep reminding me\b/.test(a.f) && !/\bsnooze/.test(a.f);
  const nl = /\bherinnering\w*\b.*\b(?:herhal\w*|opnieuw|nog eens|tot (?:het |hij )?(?:klaar|af|gedaan))\b|\bblijf (?:me )?herinneren\b/.test(a.f) && !/\bsnooze/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const d = a.taskAgain ?? null;
  return answer(d ? say(a.lang, `Your task reminders remind you again every ${d.every} minutes, up to ${d.times} times, until you tick Done or Snooze; inside your quiet hours they wait until those end. Change it in Tasks → This week → Reminders, or one task's own in its editor (Remind again).`,
    `Je taakherinneringen komen elke ${d.every} minuten terug, tot ${d.times} keer, tot je Done of Snooze kiest; binnen je stille uren wachten ze tot die voorbij zijn. Pas het aan in Tasks → This week → Reminders, of voor één taak in de editor (Remind again).`)
    : say(a.lang, 'A task reminder goes off once now. To have it come back until you tick Done or Snooze, choose “Remind again” in Tasks → This week → Reminders (every 5, 10, 15 or 30 minutes, 2 to 10 times), or for one task in its editor. Quiet hours hold the repeats; it works in the app with notifications off.',
      'Een taakherinnering gaat nu één keer af. Wil je dat hij terugkomt tot je Done of Snooze kiest, kies dan “Remind again” in Tasks → This week → Reminders (elke 5, 10, 15 of 30 minuten, 2 tot 10 keer), of voor één taak in de editor. Stille uren houden de herhalingen tegen; het werkt in de app ook zonder meldingen.'), CALLS);
}
/** "what are my snooze choices", "welke snoozetijden heb ik" (LEDGER #439). */
function snoozeAnswer(a: Ask): LocalReply | null {
  const en = /\bsnooze (?:choices|options|times|lengths)\b|\bsnooze (?:for|until) (?:my own|a custom|another)\b|\bown snooze\b|\bcustom snooze\b/.test(a.f);
  const nl = /\bsnooze ?(?:keuzes|opties|tijden)\b|\beigen snooze\b|\bhoe lang (?:kan ik )?snoozen\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const own = ownSnoozes(a.snoozes);
  return answer(own ? say(a.lang, `Your snooze choices: ${own.map(snoozeLabel).join(', ')}. The first, “${snoozeLabel(own[0]!)}”, is also the snooze button on a notification. Change them in Tasks → This week → Reminders.`,
    `Je snoozekeuzes: ${own.map(snoozeLabel).join(', ')}. De eerste, “${snoozeLabel(own[0]!)}”, is ook de snoozeknop op een melding. Pas ze aan in Tasks → This week → Reminders.`)
    : say(a.lang, 'A reminder offers the usual three: 15 min, 1 h and Tomorrow (09:00); a notification says “Snooze 1 h”. Add up to six of your own — a length, this evening at a time, tomorrow at a time, or a weekday — in Tasks → This week → Reminders; the first one goes on the notification.',
      'Een herinnering biedt de gewone drie: 15 min, 1 uur en Tomorrow (09:00); een melding zegt “Snooze 1 h”. Voeg er tot zes van jezelf toe — een duur, vanavond om een tijd, morgen om een tijd, of een weekdag — in Tasks → This week → Reminders; de eerste staat op de melding.'), CALLS);
}
