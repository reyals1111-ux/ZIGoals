import type {Intent} from './cases';

/**
 * Session AV (owner follow-up 2, item 1c; the fresh reviewers' check 5 in docs/review/session-av/quality/q1.md–q4.md):
 * the questions the AV features raise, which NOVA and ZIGi answered with something else or with the examples list. Each
 * is answered from the feature's own pure function (lib/ai/local-answers/av-answers.ts, av-life.ts), in English and Dutch.
 * `never`: the wrong answer the reviewers saw.
 */
export const AV: readonly Intent[] = [
  // Today (q1)
  {id: 'av-task-reminders', pillar: 'tasks', en: ['which task reminders do I have', 'when is my next task reminder'], nl: ['welke herinneringen heb ik voor taken', 'wanneer is mijn volgende taakherinnering'], never: ['open tasks', 'open taken']},
  {id: 'av-weekly-intention', pillar: 'tasks', en: ['what was my intention for this week', 'what is my weekly intention'], nl: ['wat was mijn voornemen voor deze week', 'wat is mijn voornemen van de week']},
  {id: 'av-countdown-until', pillar: 'agenda', en: ['how many days until mum\'s birthday', 'how long until mums birthday'], nl: ['hoeveel dagen tot de verjaardag van mama', 'hoe lang nog tot de verjaardag van mama'], never: ['habits']},
  {id: 'av-countdowns-list', pillar: 'agenda', en: ['which countdowns do I have', 'what are my countdowns'], nl: ['welke countdowns heb ik', 'wat zijn mijn aftellers']},
  {id: 'av-plan-day', pillar: 'tasks', en: ['plan my day'], nl: ['plan mijn dag', 'maak een planning voor vandaag'], never: ['"add-task"']},
  // Wealth (q1 F-YEAR, q2)
  {id: 'av-bills-year', pillar: 'wealth', en: ['how much are my bills a year', 'what do my bills cost per year', 'what do my bills cost annually'], nl: ['hoeveel kosten mijn rekeningen per jaar', 'wat kosten mijn rekeningen per jaar'], never: ['typical month (an estimate)']},
  {id: 'av-bills-paid', pillar: 'wealth', en: ['which bills have I paid this month', 'what bills are still to pay this month'], nl: ['welke rekeningen heb ik deze maand betaald', 'welke rekeningen moet ik nog betalen']},
  {id: 'av-payday', pillar: 'wealth', en: ['how much is due before payday', 'when is my next payday'], nl: ['hoeveel moet ik betalen voor de volgende salarisdag', 'wanneer is mijn volgende salarisdag']},
  {id: 'av-budget-targets', pillar: 'wealth', en: ['am I on track for my groceries target', 'what are my budget targets'], nl: ['wat zijn mijn budgetdoelen', 'ligt mijn doel voor groceries op schema'], never: ['could not find a goal']},
  {id: 'av-budget-near', pillar: 'wealth', en: ['which budget is near its limit', 'are any budgets close to their limit'], nl: ['welk budget zit bijna aan de limiet', 'welke budgetten zitten bijna aan de limiet']},
  {id: 'av-spend-vs-last', pillar: 'wealth', en: ['how does my spending compare to last month', 'how does my spending stack up against last month'], nl: ['hoe verhouden mijn uitgaven zich tot vorige maand', 'hoe zijn mijn uitgaven vergeleken met vorige maand'], never: ['the period before']},
  {id: 'av-income-went', pillar: 'wealth', en: ['where did my income go this month', 'where did my salary go this month'], nl: ['waar is mijn inkomen deze maand heen gegaan', 'waar ging mijn salaris deze maand naartoe'], never: ['most on Salary']},
  {id: 'av-debt-schedule', pillar: 'wealth', en: ['show my debt payoff schedule', 'what is my debt repayment schedule'], nl: ['laat mijn aflossingsschema zien', 'wat is mijn aflossingsschema']},
  {id: 'av-money-look', pillar: 'wealth', en: ['does anything in my money need attention', 'is there anything in my money i should look at'], nl: ['moet ik ergens naar kijken in mijn geld', 'vraagt iets in mijn geld om aandacht']},
  {id: 'av-payee', pillar: 'wealth', en: ['how much did I spend at Market', 'what did I spend at Market'], nl: ['hoeveel heb ik bij Market uitgegeven', 'hoeveel heb ik uitgegeven bij Market']},
  {id: 'av-payee-none', pillar: 'wealth', en: ['how much did I spend at Café Noël'], nl: ['hoeveel heb ik uitgegeven bij Café Noël'], never: ['435.59']},
  {id: 'av-watched', pillar: 'wealth', en: ['which categories am I watching', 'what categories do I watch'], nl: ['welke categorieën volg ik', 'welke categorieen houd ik in de gaten']},
  {id: 'av-price-alerts', pillar: 'wealth', en: ['what price alerts do I have', 'which price alerts are set'], nl: ['welke koersalarmen heb ik', 'welke prijsalarmen staan er']},
  {id: 'av-month-recap', pillar: 'wealth', en: ['how did last month go for my money', 'how was last month for my money'], nl: ['hoe ging vorige maand met mijn geld', 'hoe was vorige maand voor mijn geld']},
  // Health (q3)
  {id: 'av-saved-meals', pillar: 'health', en: ['what are my saved meals', 'which meals have I saved'], nl: ['welke maaltijden heb ik opgeslagen', 'wat zijn mijn opgeslagen maaltijden'], never: ['You logged']},
  {id: 'av-meal-plans', pillar: 'health', en: ['what meals are planned this week', 'what are my meal plans'], nl: ['welke maaltijden staan deze week gepland', 'wat is mijn weekmenu'], never: ['You logged']},
  {id: 'av-mood-factors', pillar: 'health', en: ['what affects my mood', 'what affects my sleep and energy'], nl: ['wat beïnvloedt mijn stemming', 'wat bepaalt mijn humeur'], never: ['Governance']},
  {id: 'av-lifted', pillar: 'health', en: ['how much weight did I lift this week', 'what is my training volume this week'], nl: ['hoeveel gewicht heb ik deze week getild', 'hoeveel kilo heb ik deze week getild'], never: ['73.5', '73.48']},
  {id: 'av-run-5k', pillar: 'health', en: ['what is my fastest 5k', 'what is my 5 km record'], nl: ['wat is mijn snelste 5 km', 'wat is mijn record op de 5 km']},
  {id: 'av-run-longest', pillar: 'health', en: ['what was my longest run', 'what are my running bests'], nl: ['wat was mijn langste loop', 'wat zijn mijn hardlooprecords'], never: ['No run is logged today']},
  {id: 'av-diary-today', pillar: 'health', en: ['what did I eat today'], nl: ['wat heb ik vandaag gegeten', 'wat at ik vandaag']},
  {id: 'av-sleep-score', pillar: 'health', en: ['what is my sleep score', 'sleep score'], nl: ['wat is mijn slaapscore', 'hoe hoog is mijn slaapscore']},
  {id: 'av-sleep-90', pillar: 'health', en: ['how did I sleep the last 90 days', 'average sleep over 90 days'], nl: ['hoe heb ik de afgelopen 90 dagen geslapen', 'gemiddelde slaap de laatste 90 dagen'], never: ['31 nights', 'last 30 days']},
  {id: 'av-sleep-year', pillar: 'health', en: ['how did I sleep this year'], nl: ['hoe heb ik dit jaar geslapen'], never: ['31 nights', '7 dagen']},
  {id: 'av-iron-average', pillar: 'health', en: ['average iron over the last 90 days'], nl: ['gemiddeld ijzer over de laatste 90 dagen'], never: ['complete iron total']},
  {id: 'av-high-iron', pillar: 'health', en: ['which foods are high in iron', 'which of my foods are rich in iron'], nl: ['welk eten bevat veel ijzer', 'welke voedingsmiddelen zijn rijk aan ijzer'], never: ['Calories', 'Iron today']},
  {id: 'av-bench-best', pillar: 'health', en: ['what is my bench press best', 'what is my bench press record'], nl: ['wat is mijn beste bankdrukken', 'wat is mijn record bankdrukken']},
  {id: 'av-supplements', pillar: 'health', en: ['what supplements do I take', 'which vitamins am I taking'], nl: ['welke supplementen neem ik', 'welke medicijnen gebruik ik'], never: ['open tasks']},
  {id: 'av-symptoms', pillar: 'health', en: ['what symptoms did I log this month', 'which symptoms have I logged'], nl: ['welke klachten heb ik deze maand gelogd', 'welke symptomen heb ik genoteerd'], never: ['open tasks']},
  // Journal and habits (q4)
  {id: 'av-good-things', pillar: 'journal', en: ['how many good things did I write this month', 'how many good things this month'], nl: ['hoeveel goede dingen heb ik deze maand opgeschreven', 'hoeveel goede dingen deze maand'], never: ['habits']},
  {id: 'av-journal-tag', pillar: 'journal', en: ['which journal entries are tagged work', 'show my journal entries tagged work'], nl: ['welke dagboekstukken hebben de tag work', 'welke dagboekstukken zijn getagd met work'], never: ['written on']},
  {id: 'av-journal-count', pillar: 'journal', en: ['how many journal entries did I write today', 'how many journal entries today'], nl: ['hoeveel dagboekstukken heb ik vandaag geschreven', 'hoeveel dagboekstukken vandaag']},
  {id: 'av-journal-templates', pillar: 'journal', en: ['what journal templates do I have', 'which journal templates are there'], nl: ['welke dagboeksjablonen heb ik', 'welke sjablonen heeft mijn dagboek'], never: ['written on']},
  {id: 'av-journal-question', pillar: 'journal', en: ['what is today\'s journal question', 'what is the question of the day'], nl: ['wat is de dagboekvraag van vandaag', 'wat is de vraag van de dag'], never: ['written today', 'geschreven vandaag']},
  {id: 'av-yesterday-open', pillar: 'habits', en: ['which habits did I leave open yesterday', 'which habits are still open from yesterday'], nl: ['welke gewoontes heb ik gisteren open gelaten', 'welke gewoontes bleven gisteren open'], never: ['left today', 'open vandaag']},
  {id: 'av-focus-habit', pillar: 'habits', en: ['what is my focus habit today', 'which habit am I focusing on today'], nl: ['wat is mijn focusgewoonte vandaag', 'welke gewoonte is mijn focus vandaag'], never: ['Focus: nothing logged']},
  // av-habits-week moved to local-answers/av-answers.test.ts (ZIGi only: on NOVA it is the stage's habit-week widget).
];
