import {addLocalDays} from '../../local-date';
import {carriedPicks, picksToday, readMyDay} from '../../tasks/my-day';
import {noteRemindersBetween} from '../../tasks/note-reminder-days';
import {projectRules, type ProjectRule} from '../../tasks/rules';
import {projectFields} from '../../tasks/custom-fields';
import {galleryByGroup, type GalleryGroup} from '../../tasks/template-gallery';
import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, list, num, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {isFinished} from '../../tasks/finished';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223–#229; Microsoft To Do, Google Tasks, Any.do): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to what round 2's Tasks features hold — today's My Day picks and the ones from the last
 * day, the reminders written in notes for today, the template gallery, imports from Trello and Asana, printing a list,
 * project rules and custom fields. Each reads the feature's own pure function under the Today switch (tasks; notes only
 * where NOVA's Notes scope shares them). The planning record comes in `extra.plan` or `env.nova.taskPlan`.
 */
export type Av2TasksR2Extra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null};
const CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
/** "yesterday" / "gisteren", else the day in words. */
const lastDay = (lang: 'en' | 'nl', day: string, today: string) => day === addLocalDays(today, -1) ? say(lang, 'yesterday', 'gisteren') : dayIn(lang, day, today);

export function av2TasksR2Answer(question: string, env: ToolEnv, extra: Av2TasksR2Extra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null};
  for (const one of ANSWERS) {
    const r = one(ask);
    if (r) return r;
  }
  return null;
}
/** The tasks record under the Today switch, or the reply that says why not. */
function tasksOf(a: Ask): {record: Tasks} | {reply: LocalReply} | null {
  const shut = closed(a.env, 'today'); if (shut) return {reply: shut};
  const record = a.env.nova?.tasks;
  if (record === undefined) return null;
  if (!record) return {reply: answer(say(a.lang, 'Your tasks can’t be read on this device right now, so I can’t say.', 'Je taken kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), CALLS)};
  return {record};
}

/** "what is in my day", "what did I pick for today", "wat staat er in mijn dag" (Microsoft To Do's My Day; never "plan my day"). */
function myDay(a: Ask): LocalReply | null {
  if (/\bplan\b|\bplannen\b|\bplanning\b|\btoo full\b|\bte vol\b/.test(a.f)) return null;
  const en = /\b(?:in|on) my day\b|\bmy day list\b|\bpicked for today\b|\bpick(?:ed)? for my day\b/.test(a.f);
  const nl = /\b(?:in|op) mijn dag\b|\bmijn dag lijst\b|\bmijn daglijst\b|\bgekozen voor vandaag\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const md = readMyDay(a.plan?.myDay), open = new Map(got.record.tasks.filter(t => !t.doneAt).map(t => [t.id, t]));
  const done = new Map(got.record.tasks.filter(isFinished /* review B5L-3 */).map(t => [t.id, t]));
  const ids = picksToday(md, a.today), now = ids.map(id => open.get(id)).filter(t => !!t), finished = ids.filter(id => done.has(id)).length;
  const carried = carriedPicks(md, a.today, id => open.has(id));
  const back = carried ? say(a.lang, ` ${count(carried.ids.length, 'en', ['task', 'tasks'], ['', ''])} from ${lastDay('en', carried.day, a.today)} ${carried.ids.length === 1 ? 'is' : 'are'} still open: Plan my day offers ${carried.ids.length === 1 ? 'it' : 'them'} back.`,
    ` ${count(carried.ids.length, 'nl', ['', ''], ['taak', 'taken'])} van ${lastDay('nl', carried.day, a.today)} ${carried.ids.length === 1 ? 'staat' : 'staan'} nog open: Plan my day biedt ${carried.ids.length === 1 ? 'hem' : 'ze'} weer aan.`) : '';
  if (!now.length) return answer(say(a.lang, `Nothing is in My Day${finished ? ' still to do' : ''} today. Add a task to My Day from its editor or from Plan my day in Tasks → Today; its own day stays.${back}`,
    `Er staat vandaag niets${finished ? ' meer open' : ''} in My Day. Zet een taak in My Day met de knop in de editor, ook Plan my day in Tasks → Today biedt dat; zijn eigen dag blijft staan.${back}`), CALLS);
  const lines = now.slice(0, 10).map(t => `• ${clean(t!.title, 80)}${t!.due && t!.due !== a.today ? say(a.lang, ` (its day: ${dayIn('en', t!.due, a.today)})`, ` (eigen dag: ${dayIn('nl', t!.due, a.today)})`) : ''}`);
  return answer([say(a.lang, `${count(now.length, 'en', ['task', 'tasks'], ['', ''])} in My Day today${finished ? `, ${finished} done` : ''}:`, `${count(now.length, 'nl', ['', ''], ['taak', 'taken'])} in My Day vandaag${finished ? `, ${finished} klaar` : ''}:`), ...lines].join('\n') + back, CALLS);
}

/**
 * "which reminders from my notes are today", "welke herinneringen uit mijn notities zijn er vandaag" (LEDGER #224): the note
 * reminders of today, tomorrow or this week, as Tasks and the Agenda list them; under NOVA's Notes scope.
 */
function noteRemindersOn(a: Ask): LocalReply | null {
  const about = /\breminders?\b.*\bnotes?\b|\bnotes?\b.*\breminders?\b/.test(a.f) || /\bherinnering(?:en)?\b.*\bnotities?\b|\bnotities?\b.*\bherinnering(?:en)?\b/.test(a.f);
  const when = /\btomorrow\b|\bmorgen\b/.test(a.f) ? 'tomorrow' : /\bthis week\b|\bdeze week\b/.test(a.f) ? 'week' : /\btoday\b|\bvandaag\b|\bon my agenda\b|\bop mijn agenda\b/.test(a.f) ? 'today' : null;
  if (!about || !when) return null;
  const notes = a.env.nova?.notes, calls = [{tool: 'notes', args: {}, label: 'Notes'}];
  if (!notes) return answer(say(a.lang, 'Your notes aren’t shared here. Reminders written in notes show in Tasks → Today and Upcoming, and on the Agenda, each opening its note.', 'Je notities worden hier niet gedeeld. Herinneringen in notities staan in Tasks → Today en Upcoming en op de Agenda, elk met een link naar de notitie.'), calls);
  const from = when === 'tomorrow' ? addLocalDays(a.today, 1) : a.today, to = when === 'week' ? addLocalDays(a.today, 6) : from;
  const list = noteRemindersBetween(notes, from, to, a.today, a.env.habitZone || 'UTC', a.env.now.getTime());
  const span = when === 'tomorrow' ? say(a.lang, 'tomorrow', 'morgen') : when === 'week' ? say(a.lang, 'in the next seven days', 'de komende zeven dagen') : say(a.lang, 'today', 'vandaag');
  if (!list.length) return answer(say(a.lang, `No reminder from your notes ${span}. Write “@remind tomorrow 9:00 call the plumber” on a line of a note, and it shows in Tasks → Today and on the Agenda.`, `Geen herinnering uit je notities ${span}. Zet “@remind morgen 9:00 loodgieter bellen” op een regel van een notitie; dan staat hij in Tasks → Today en op de Agenda.`), calls);
  return answer([say(a.lang, `${count(list.length, 'en', ['reminder', 'reminders'], ['', ''])} from your notes ${span}:`, `${count(list.length, 'nl', ['', ''], ['herinnering', 'herinneringen'])} uit je notities ${span}:`),
    ...list.slice(0, 8).map(r => `• ${clean(r.what, 80)}: ${when === 'week' ? `${dayIn(a.lang, r.day, a.today)} ` : ''}${say(a.lang, 'at', 'om')} ${clockIn(a.lang, r.time)}${r.gone ? say(a.lang, ' (gone off)', ' (al geweest)') : ''}`)].join('\n'), calls);
}

/** "how do I print my tasks", "hoe print ik mijn takenlijst" (LEDGER #225, Google Tasks' print). */
function printList(a: Ask): LocalReply | null {
  if (!(/\bprint\b|\bprinting\b|\bprinten\b|\bprint ik\b|\buitprinten\b|\bafdrukken\b/.test(a.f) && /\btasks?\b|\bto ?do\b|\btaken(?:lijst)?\b|\blijst\b|\bproject\b/.test(a.f))) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  return answer(say(a.lang, 'Open the list in Tasks (a project, Today, Upcoming or any view) and press “Print this list” under it. The sheet has the title, the sections or days, a tick box per task, its day and priority, and subtasks indented; choose Save as PDF in the print window to keep a file.',
    'Open de lijst in Tasks (een project, Today, Upcoming, elke weergave) en druk eronder op “Print this list”. Het blad heeft de titel, de secties en dagen, een vakje per taak, de dag en prioriteit, en subtaken ingesprongen; kies Opslaan als pdf in het printvenster voor een bestand.'), CALLS);
}

/** "which templates are there for home", "welke sjablonen zijn er voor het gezin" (LEDGER #226, the gallery by group). */
const GROUP_ASKED: [RegExp, GalleryGroup][] = [[/\bhome\b|\bhouse\b|\bthuis\b|\bhuis\b|\bclean|\bschoonma|\bparty\b|\bfeest|\bpack|\bpaklijst/, 'home'], [/\bwork\b|\bjob\b|\bwerk\b|\bmeeting\b|\bvergader|\bproject (?:start|kick)/, 'work'], [/\bfamily\b|\bkids?\b|\bchild(?:ren)?\b|\bschool\b|\bgezin\b|\bkinder|\bkind\b/, 'family'], [/\bpersonal\b|\btax\b|\bpersoonlijk\b|\bbelasting/, 'personal']];
function gallery(a: Ask): LocalReply | null {
  if (!(/\btemplates?\b|\bgallery\b/.test(a.f) || /\bsjablon(?:en)?\b|\bgalerij\b/.test(a.f))) return null;
  if (/\bjournal|dagboek\b|\bnote|notitie/.test(a.f)) return null;
  const groups = GROUP_ASKED.filter(([re]) => re.test(a.f)).map(([, g]) => g), all = /\bgallery\b|\bgalerij\b/.test(a.f);
  if (!groups.length && !all) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const lang = a.lang, show = galleryByGroup(lang).filter(g => all && !groups.length ? true : groups.includes(g.group));
  const lines = show.map(g => `• ${g.title}: ${list(g.items.map(t => t.name), lang)}`);
  return answer([say(lang, `In the template gallery (Tasks → Areas and templates), in English and Dutch:`, `In de sjablonengalerij (Tasks → Areas and templates), in het Nederlands en Engels:`), ...lines,
    say(lang, 'Choose one, a name and a start day, and Make the project: its sections and days come with it.', 'Kies er een, een naam en een startdag, en maak het project: de secties en dagen komen mee.')].join('\n'), CALLS);
}

/** "can I import my tasks from Trello", "kan ik mijn taken uit Asana importeren" (LEDGER #227). */
function importFrom(a: Ask): LocalReply | null {
  const app = /\btrello\b/.test(a.f) ? 'Trello' : /\basana\b/.test(a.f) ? 'Asana' : /\bclickup\b|\bmonday\b/.test(a.f) ? 'other' : null;
  if (!app || !/\bimport|\bbring|\bmove|\bover|\bimporteren\b|\bimporteer\b|\boverzetten\b|\bhalen\b|\bmeenemen\b/.test(a.f)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  if (app === 'other') return answer(say(a.lang, 'Not from ClickUp or Monday.com yet: ZIGoals reads only exports whose layout the app documents. Tasks → Import / export reads Todoist, TickTick, Trello (JSON), Asana (CSV) and calendar (.ics) files.',
    'Nog niet uit ClickUp en Monday.com: ZIGoals leest alleen exports waarvan de app de opbouw beschrijft. Tasks → Import / export leest Todoist, TickTick, Trello (JSON), Asana (CSV) en agendabestanden (.ics).'), CALLS);
  return answer(app === 'Trello'
    ? say(a.lang, 'Yes. In Trello: the board’s menu → Print, export and share → Export as JSON. Then Tasks → Import / export and choose the file: the board becomes a project, its lists sections, cards tasks and checklist items subtasks. You see a preview first, and Undo takes it back. Archived cards and members are left out.',
      'Ja. In Trello: menu van het bord → Print, export and share → Export as JSON. Daarna Tasks → Import / export en kies het bestand: het bord wordt een project, de lijsten secties, kaarten taken en checklistpunten subtaken. Je ziet eerst een voorbeeld, en Undo draait het terug. Gearchiveerde kaarten en leden blijven weg.')
    : say(a.lang, 'Yes. In Asana: the project’s menu → Export/Print → CSV. Then Tasks → Import / export and choose the file: its sections, tasks with due days, tags, notes and subtasks come in, after a preview; Undo takes it back. Assignees are left out.',
      'Ja. In Asana: menu van het project → Export/Print → CSV. Daarna Tasks → Import / export en kies het bestand: secties, taken met hun datum, tags, notities en subtaken komen binnen, na een voorbeeld; Undo draait het terug. Wie een taak toegewezen kreeg, blijft weg.'), CALLS);
}

/** "which rules do my projects have", "welke automatiseringen heb ik in mijn projecten" (LEDGER #228). */
function projectRulesAnswer(a: Ask): LocalReply | null {
  if (!(/\bautomations?\b|\bautomate\b|\brules?\b.*\b(?:projects?|tasks?)\b|\b(?:projects?|tasks?)\b.*\brules?\b/.test(a.f) || /\bautomatiser|\bregels?\b.*\b(?:project(?:en)?|taken)\b|\b(?:project(?:en)?|taken)\b.*\bregels?\b/.test(a.f))) return null;
  if (/\bhabit|gewoonte|budget|money|geld\b/.test(a.f)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const withRules = (got.record.projects ?? []).filter(p => !p.archived && projectRules(got.record, p.id).length);
  if (!withRules.length) return answer(say(a.lang, 'No project has rules yet. Open a project in Tasks, then Rules and fields: for example, when a task enters “Done”, mark it done.', 'Nog geen project heeft regels. Open een project in Tasks en dan Rules and fields: bijvoorbeeld, als een taak in “Klaar” komt, vink hem af.'), CALLS);
  const lines = withRules.slice(0, 6).map(p => `• ${clean(p.name, 60)}: ${projectRules(got.record, p.id).slice(0, 4).map(r => ruleLine(r, got.record, a.lang)).join('; ')}`);
  const total = withRules.reduce((n, p) => n + projectRules(got.record, p.id).length, 0);
  return answer([say(a.lang, `${count(total, 'en', ['rule', 'rules'], ['', ''])} in ${count(withRules.length, 'en', ['project', 'projects'], ['', ''])}:`, `${count(total, 'nl', ['', ''], ['regel', 'regels'])} in ${count(withRules.length, 'nl', ['', ''], ['project', 'projecten'])}:`), ...lines,
    say(a.lang, 'They run on this device as tasks change, in the same Undo.', 'Ze draaien op dit apparaat zodra taken veranderen, in dezelfde Undo.')].join('\n'), CALLS);
}
function ruleLine(r: ProjectRule, record: Tasks, lang: 'en' | 'nl'): string {
  const sec = (id?: string) => clean(record.sections?.find(s => s.id === id)?.name ?? '?', 40);
  const when = r.when === 'added' ? say(lang, 'when added', 'bij toevoegen') : r.when === 'section' ? say(lang, `in “${sec(r.section)}”`, `in “${sec(r.section)}”`) : say(lang, 'when done', 'als klaar');
  const then = r.then === 'level' ? `P${r.level}` : r.then === 'label' ? `@${r.label}` : r.then === 'today' ? say(lang, 'plan for today', 'plannen voor vandaag') : r.then === 'done' ? say(lang, 'mark done', 'afvinken')
    : r.then === 'move' ? say(lang, `move to “${sec(r.to)}”`, `naar “${sec(r.to)}”`) : say(lang, `make the next one${r.days !== undefined ? ` in ${r.days} days` : ''}`, `maak de volgende${r.days !== undefined ? ` over ${r.days} dagen` : ''}`);
  return `${when} → ${then}`;
}

/** "which custom fields do my projects have", "welke eigen velden hebben mijn projecten" (LEDGER #229). */
function customFields(a: Ask): LocalReply | null {
  if (!(/\b(?:custom|own|extra|project) fields?\b|\bfields?\b.*\b(?:projects?|tasks?)\b/.test(a.f) || /\b(?:eigen|extra|aangepaste) velden\b|\bvelden?\b.*\b(?:project(?:en)?|taken)\b/.test(a.f))) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const withFields = (got.record.projects ?? []).filter(p => !p.archived && projectFields(got.record, p.id).length);
  if (!withFields.length) return answer(say(a.lang, 'No project has fields of its own yet. Open a project in Tasks, then Rules and fields, and add one (a budget, a room, an order-by day); fill it in each task’s editor and sort by it in Tasks → Table.',
    'Nog geen project heeft eigen velden. Open een project in Tasks en dan Rules and fields, en voeg er een toe (een budget, een kamer, een besteldatum); vul hem in de editor van elke taak in en sorteer erop in Tasks → Table.'), CALLS);
  const lines = withFields.slice(0, 6).map(p => {
    const tasks = got.record.tasks.filter(t => t.projectId === p.id && !t.doneAt);
    return `• ${clean(p.name, 60)}: ${projectFields(got.record, p.id).map(f => { const filled = tasks.filter(t => t.fields?.[f.id] !== undefined).length; const sum = f.kind === 'number' ? tasks.reduce((n, t) => n + (typeof t.fields?.[f.id] === 'number' ? t.fields![f.id] as number : 0), 0) : null;
      return `${clean(f.name, 40)} (${say(a.lang, `${filled} of ${tasks.length} open tasks filled in`, `${filled} van ${tasks.length} open taken ingevuld`)}${sum !== null && filled ? say(a.lang, `, ${num(sum)} in all`, `, ${num(sum)} samen`) : ''})`; }).join(', ')}`;
  });
  return answer([say(a.lang, `${count(withFields.length, 'en', ['project has', 'projects have'], ['', ''])} fields of ${withFields.length === 1 ? 'its' : 'their'} own:`, `${count(withFields.length, 'nl', ['', ''], ['project heeft', 'projecten hebben'])} eigen velden:`), ...lines,
    say(a.lang, 'Sort by them in Tasks → Table with the project chosen.', 'Sorteer erop in Tasks → Table met het project gekozen.')].join('\n'), CALLS);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [myDay, noteRemindersOn, printList, gallery, importFrom, projectRulesAnswer, customFields];
