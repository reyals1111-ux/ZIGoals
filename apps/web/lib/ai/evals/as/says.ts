/**
 * Session AS (ADR-042 Part 1, approval item 7): the facts every phrasing of a question must state, written by hand from
 * the Showcase's records for 17 November 2026 (a Tuesday; this week is Mon 16 – Tue 17, last week Mon 9 – Sun 15). Names,
 * figures and dates are written the same in English and Dutch, so one list holds for both. oracle.test.ts recomputes the
 * ones that matter most from the raw records by a second, simpler path. An empty list: the answer is words, not figures
 * (an honest line, a privacy answer); its whole sentence is still pinned in expected.json.
 */
export const SAYS: Readonly<Record<string, readonly string[]>> = {
  // Habits
  'hab-missed-week': ['Exercise', 'Meditate', 'Drink water'], 'med-notdone-month': ['Nov 3', 'Nov 12'], 'hab-missed-month': ['Late-night snacks'], 'hab-missed-yesterday': ['7'],
  'hab-skipped-month': ['Late-night snacks', 'Read'], 'hab-notdone-lastweek': ['Late-night snacks', 'Contribute'], 'hab-missed-days-month': ['Nov 8', 'Nov 13'], 'med-missed-month': ['Nov 3', 'Nov 12'],
  'med-skipped-month': ['Nov 3', 'Nov 12'], 'snacks-missed-month': ['Nov 8', 'Nov 13'], 'read-notdone-lastweek': ['Nov 15'], 'exercise-notdone-month': ['Nov 5', 'Nov 14'],
  'read-done-dates-week': ['Nov 16', 'Nov 17'], 'walk-done-count-lastweek': ['6'], 'hab-open-today': ['Exercise', 'Meditate', 'Drink water'], 'hab-notdone-today': ['Exercise', 'Meditate', 'Drink water'],
  'hab-missed-days-lastweek': ['Nov 13'], 'hab-most-missed': ['Late-night snacks'], 'hab-skipped-lastweek': ['Late-night snacks'], 'read-mondays': ['Oct 19'],
  'water-habit-skipped-month': ['Nov 1', 'Nov 10'], 'contribute-notdone-month': ['Nov 2', 'Nov 11'], 'walk-missed-since': ['Nov 4', 'Nov 13'], 'hab-weekday': ['7', '35'],
  'hab-compare-weeks': ['11', '40', '41'], 'hab-perfect-days': ['14'], 'hab-done-today-nl': ['Read', 'Walk', 'Contribute'], 'hab-streaks-nl': ['27'], 'hab-week-nl': ['Exercise'], 'med-count-lastweek-nl': ['6'],
  // Health
  'water-today': ['1,000'], 'water-yesterday': ['2,100'], 'water-notreached-month': ['Nov 1', 'Nov 10'], 'water-notreached-lastweek': [], 'water-average-week': ['2,071'], 'water-compare-weeks': ['3,100', '13,500'],
  'steps-today': ['8,800'], 'steps-yesterday': ['8,100'], 'steps-missed-days-month': ['Nov 3', 'Nov 15'], 'steps-missed-lastweek': ['Nov 9', 'Nov 15'], 'steps-compare-weeks': ['16,900', '51,100'],
  'steps-average-month': ['7,524'], 'steps-best-month': ['8,800', 'Nov 2'], 'sleep-lastnight': ['7 h 17 min'], 'sleep-under-goal-month': ['13'], 'sleep-under-goal-lastweek': ['6'],
  'sleep-average-week': ['6 h 57 min'], 'sleep-average-lastweek': ['6 h 51 min'], 'sleep-best-month': ['Nov 7', '8 h 5 min'], 'sleep-worst-month': ['Nov 12', '6 h 18 min'], 'sleep-compare-weeks': ['6 h 57 min', '6 h 51 min'],
  'weight-now': ['73.'], 'weight-last-weighin': ['Nov 16'], 'weight-days-month': ['Nov 4', 'Nov 16'], 'weight-notlogged-lastweek': ['Nov 9', 'Nov 15'],
  'workouts-month': ['9'], 'workouts-lastweek': ['4'], 'workouts-yesterday': ['49'], 'workouts-none-lastweek': ['Nov 9', 'Nov 10', 'Nov 14'], 'workouts-days-month': ['Nov 4', 'Nov 16'],
  'calories-today': ['1,970'], 'protein-today': ['131'], 'protein-missed-lastweek': ['Nov 13'], 'food-notlogged-month': ['17'], 'heart-rate': [], 'health-overall': ['7 h 17 min', '8,800'], 'calories-week': ['4,039', 'Nov 16', 'Nov 17'], 'protein-week': ['269', '134'],
  // Wealth and Goals
  'spend-month': ['435.59'], 'spend-lastmonth': ['176.40'], 'spend-week': ['55.60'], 'spend-yesterday': ['51.40'], 'spend-top-month': ['Groceries', '187.10'], 'spend-top-lastmonth': ['Groceries', '80.90'],
  'spend-groceries-month': ['187.10'], 'spend-biggest-expense': ['120.00', 'Nov 8'], 'spend-compare-months': ['435.59', '176.40'], 'spend-days-month': ['13'], 'spend-none-days-lastweek': ['Nov 11'],
  'spend-average-month': ['25.62'], 'income-month': ['2,550.00'], 'income-lastmonth': [], 'budgets-over': [], 'budgets-status': ['Groceries', '187.10'], 'budget-fun-left': ['24.00', '60.00'],
  'bills-next': ['Rent', '950.00'], 'bills-overdue': ['Rent'], 'bills-week': ['Rent'], 'bills-list': ['Rent', 'Energy'], 'bills-total': ['1,094.99'], 'networth-now': ['531,029.00'], 'coin-btc': ['0.45 BTC', 'Wealth', 'Portfolio'], 'coin-eth': ['4 ETH', 'Wealth', 'Portfolio'],
  'goals-status': ['Emergency fund', '45%'], 'goals-behind': ['Japan adventure'], 'goals-closest': ['First home deposit', '65%'], 'goals-furthest': ['Japan adventure'], 'goals-reached': ['My first 0.1 BTC'],
  'goals-next-date': ['Apr 16, 2027', 'Japan adventure'], 'goals-milestones': ['Launch my creative studio', '2', '4', 'Find the first client', 'Emergency fund', 'Sleep 8 hours a night'], 'goal-japan': ['2,500', '6,000'], 'goal-emergency': ['9,000', '20,000'], 'goal-emergency-eta': ['Jan 31, 2028', 'Nov 16, 2028', '11,000.00', '—'], 'goal-japan-eta': ['Japan adventure', 'Apr 16, 2027', '3,500.00'], 'networth-year': ['531,029.00', '8,000.00'],
  // The day, the journal, focus and NOVA itself
  'tasks-overdue': ['Sketch the garden bed', 'Book the dentist'], 'tasks-open': ['5'], 'tasks-tomorrow': ['2'], 'tasks-week': ['Compare two savings accounts', 'Draft the trip budget'],
  'tasks-done-week': ['Renew the library card'], 'tasks-done-lastweek': [], 'tasks-priority': ['Book the dentist'], 'tasks-next': ['Sketch the garden bed'],
  'journal-today': [], 'journal-notdone-month': ['Nov 1', 'Nov 13'], 'journal-days-month': ['10'], 'journal-lastweek': ['5'], 'journal-streak': ['4'], 'journal-last': ['Nov 17'], 'notes-count': [],
  'agenda-today': ['Meditate'], 'agenda-tomorrow': ['Upper body session'], 'agenda-next': ['Meditate'], 'checklist-today': [],
  'focus-week': ['150'], 'focus-today': [], 'focus-month': ['397'], 'focus-none-days-lastweek': ['Nov 9', 'Nov 15'], 'focus-days-month': ['Nov 1', 'Nov 16'], 'focus-best-month': ['Nov 16', '150'], 'focus-compare-weeks': ['150', '136'],
  'nova-sees': ['Habits', 'Health'], 'nova-private': [], 'nova-can-answer': [], 'life-doing': ['4', '7'], 'life-week': [], 'why-sleep': [], 'why-habits': [], 'unknown-sleep': [], 'unknown-spending': [],
  // Session AT (L7 NB:N11): Journey's own count (lib/game/xp.ts) on the Showcase's records, labelled as the Showcase's.
  // Session AU (dress rehearsal, REHEARSAL.md R-1 … R-12, the Showcase's records).
  'au-r1-habit-streak': ['Drink water', '26'], 'au-r12-habit-missed': ['Drink water', 'Nov 1', 'Nov 10'], 'au-r2-lift-today': ['Push day', 'Bench press', '62.5 kg', 'Nov 16'], 'au-r2-lift-yesterday': ['Push day', 'Bench press', '62.5 kg'],
  'au-r3-run-week': ['Nov 15', '6 km'], 'au-r3-run-lastweek': ['6 km', 'Nov 15'], 'au-r4-date': ['Nov 17'], 'au-r6-bill-price': [], 'au-r7-coin-price': ['65,000 USD', 'Showcase example price'],
  'au-r8-stake-earn': ['Earn'], 'au-r10-stake-safe': ['ZIG', 'Alpha', 'unbonding'], 'au-r11-next-bill': ['Rent', '950.00', 'Dec 1'],
  'journey-level': ['8', 'Nebula', '3,577', '377', '850', 'Showcase'],
};
