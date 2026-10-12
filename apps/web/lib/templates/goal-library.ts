import type {BuiltInArea} from '../goal-extras/store';
import type {AverageMetric} from '../average-goals/store';

/**
 * G6, the template library (Session AA-Cloud Part 2): ready goals across every life area that pre-fill the existing
 * goal wizard (name, kind, life area, milestones) and offer habits that help. As with the Goal creator's ideas (Session W
 * Part 11), a money template never suggests a sum, a rate or a date: the amount is always the person's own. A template
 * that names a count ("12 books", "100 days") names it as its milestones, which the person can change. "Keep an
 * average" templates open the average-goal form with a common target the person can change; a weight goal opens Health
 * goals, where its progress comes from the Health journal.
 */
export type TemplateKind = 'value' | 'project' | 'average' | 'health-weight';
export type TemplateHabit = {title: string; schedule: 'daily' | 'weekdays' | 'three-a-week'; why: string};
export type LibraryTemplate = {
  id: string; title: string; area: BuiltInArea; kind: TemplateKind; summary: string;
  milestones?: readonly string[];
  habits?: readonly TemplateHabit[];
  average?: {metric: AverageMetric; target: number; direction: 'at-least' | 'at-most'; windowDays: 7 | 14 | 30; unit: string};
  keywords?: readonly string[];
};
const h = (title: string, schedule: TemplateHabit['schedule'], why: string): TemplateHabit => ({title, schedule, why});

export const GOAL_LIBRARY: readonly LibraryTemplate[] = [
  // Health
  {id: 'run-10k', title: 'Run a 10K', area: 'health', kind: 'project', summary: 'From your first easy run to 10 km.', milestones: ['Run 3 km without stopping', 'Run 5 km', 'Run 8 km', 'Run 10 km'], habits: [h('Easy run', 'three-a-week', 'Three short runs a week build the base.')], keywords: ['running', 'race', 'fitness']},
  {id: 'lose-5kg', title: 'Lose 5 kg', area: 'health', kind: 'health-weight', summary: 'A weight goal from your Health journal; the target is yours.', habits: [h('Log my meals', 'daily', 'What gets noticed gets easier.'), h('Walk after dinner', 'daily', 'A small daily movement.')], keywords: ['weight', 'diet', 'kilos']},
  {id: 'sleep-7h', title: 'Sleep 7 hours a night', area: 'health', kind: 'average', summary: 'Keep a 7-hour average over two weeks.', average: {metric: 'sleep-hours', target: 7, direction: 'at-least', windowDays: 14, unit: 'h a night'}, habits: [h('Screens off by 22:30', 'daily', 'An easier way into sleep.')], keywords: ['rest', 'bedtime']},
  {id: 'steps-8000', title: '8,000 steps a day', area: 'health', kind: 'average', summary: 'An average of 8,000 steps over a week.', average: {metric: 'steps', target: 8000, direction: 'at-least', windowDays: 7, unit: 'steps a day'}, habits: [h('A 20-minute walk', 'daily', 'Most of the steps in one go.')], keywords: ['walking', 'activity']},
  {id: 'water-2l', title: 'Drink 2 litres a day', area: 'health', kind: 'average', summary: 'A two-litre average over a week.', average: {metric: 'water-ml', target: 2000, direction: 'at-least', windowDays: 7, unit: 'mL a day'}, habits: [h('A glass with every meal', 'daily', 'Water tied to a moment you already have.')], keywords: ['hydration']},
  {id: 'strength-12w', title: 'Twelve weeks of strength', area: 'health', kind: 'project', summary: 'Three strength sessions a week for twelve weeks.', milestones: ['Week 1 done', 'Week 4 done', 'Week 8 done', 'Week 12 done'], habits: [h('Strength session', 'three-a-week', 'Consistency beats intensity.')], keywords: ['gym', 'weights', 'fitness']},
  // Habits & Mind
  {id: 'meditate-100', title: 'Meditate 100 days', area: 'mind', kind: 'project', summary: 'A short sit, a hundred times.', milestones: ['25 days', '50 days', '75 days', '100 days'], habits: [h('Meditate 10 minutes', 'daily', 'Ten minutes is enough to start.')], keywords: ['mindfulness', 'calm']},
  {id: 'journal-30', title: 'Journal for 30 days', area: 'mind', kind: 'project', summary: 'A few lines every evening for a month.', milestones: ['7 days', '14 days', '21 days', '30 days'], habits: [h('Write three lines', 'daily', 'Small enough to never skip.')], keywords: ['writing', 'reflection']},
  {id: 'digital-detox', title: 'Less screen time', area: 'mind', kind: 'average', summary: 'Keep your phone time under 2 hours a day on average.', average: {metric: 'custom', target: 2, direction: 'at-most', windowDays: 7, unit: 'h a day'}, habits: [h('Phone in another room at night', 'daily', 'Out of reach, out of mind.')], keywords: ['phone', 'focus']},
  {id: 'morning-routine', title: 'Build a morning routine', area: 'mind', kind: 'project', summary: 'A calm first hour, step by step.', milestones: ['Pick three steps', 'Two weeks in a row', 'A month in a row'], habits: [h('Up at the same time', 'weekdays', 'The anchor of a routine.')], keywords: ['routine', 'productivity']},
  {id: 'gratitude-60', title: 'Sixty days of gratitude', area: 'mind', kind: 'project', summary: 'One thing you are grateful for, every day.', milestones: ['20 days', '40 days', '60 days'], habits: [h('Note one good thing', 'daily', 'Thirty seconds a day.')], keywords: ['wellbeing', 'happiness']},
  {id: 'no-sugar-30', title: '30 days without added sugar', area: 'mind', kind: 'project', summary: 'A month-long reset.', milestones: ['First week', 'Two weeks', 'Three weeks', 'Thirty days'], habits: [h('No added sugar today', 'daily', 'One day at a time.')], keywords: ['nutrition', 'challenge']},
  // Wealth
  {id: 'emergency-fund', title: 'Emergency fund', area: 'wealth', kind: 'value', summary: 'A safety net in your currency; the amount is yours.', milestones: ['One month of costs', 'Three months of costs', 'Six months of costs'], habits: [h('Move money on payday', 'weekdays', 'Pay yourself first.')], keywords: ['savings', 'safety net', 'rainy day']},
  {id: 'house-deposit', title: 'House deposit', area: 'wealth', kind: 'value', summary: 'Toward a home of your own.', milestones: ['A quarter of the deposit', 'Half of it', 'Three quarters', 'The full deposit'], keywords: ['home', 'mortgage', 'property']},
  {id: 'pay-off-card', title: 'Pay off a credit card', area: 'wealth', kind: 'value', summary: 'Clear a balance; record what you pay toward it.', milestones: ['First payment above the minimum', 'Half paid off', 'Paid off'], habits: [h('Check spending', 'weekdays', 'Two minutes a day keeps it honest.')], keywords: ['debt', 'loan']},
  {id: 'invest-monthly', title: 'Invest every month', area: 'wealth', kind: 'value', summary: 'A regular amount, your choice of asset.', milestones: ['First three months', 'Six months', 'A full year'], keywords: ['investing', 'etf', 'stocks']},
  {id: 'holiday-fund', title: 'Holiday fund', area: 'wealth', kind: 'value', summary: 'Save for a trip, by a date if you like.', milestones: ['Booked the dates', 'Half saved', 'Fully saved'], keywords: ['travel', 'vacation', 'trip']},
  {id: 'no-spend-month', title: 'A no-spend month', area: 'wealth', kind: 'project', summary: 'Only essentials for a month.', milestones: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], habits: [h('No-spend day', 'daily', 'Count the days you made it.')], keywords: ['budget', 'frugal']},
  // Relationships
  {id: 'weekly-call', title: 'Call family every week', area: 'relationships', kind: 'project', summary: 'A weekly call with someone who matters.', milestones: ['4 calls', '12 calls', '26 calls', '52 calls'], habits: [h('Sunday call', 'three-a-week', 'A set moment makes it easy.')], keywords: ['family', 'friends', 'call']},
  {id: 'date-nights', title: 'A date night every month', area: 'relationships', kind: 'project', summary: 'Twelve evenings together this year.', milestones: ['3 date nights', '6', '9', '12'], keywords: ['partner', 'love']},
  {id: 'reconnect-friends', title: 'Reconnect with five friends', area: 'relationships', kind: 'project', summary: 'Five people you have not seen in a while.', milestones: ['First friend', 'Three friends', 'All five'], keywords: ['friendship', 'social']},
  {id: 'host-dinner', title: 'Host four dinners', area: 'relationships', kind: 'project', summary: 'Friends at your table, once a season.', milestones: ['Spring', 'Summer', 'Autumn', 'Winter'], keywords: ['cooking', 'hosting']},
  {id: 'kids-time', title: 'One-to-one time with each child', area: 'relationships', kind: 'project', summary: 'Regular time with each child, just the two of you.', milestones: ['A month of weekly time', 'Three months', 'Six months'], habits: [h('Twenty minutes, phone away', 'daily', 'Small and undivided.')], keywords: ['parenting', 'family']},
  {id: 'volunteer', title: 'Volunteer 20 hours', area: 'relationships', kind: 'project', summary: 'Give time to a cause you care about.', milestones: ['5 hours', '10 hours', '15 hours', '20 hours'], keywords: ['community', 'charity']},
  // Career
  {id: 'promotion', title: 'Go for a promotion', area: 'career', kind: 'project', summary: 'Prepare the case, then ask.', milestones: ['Talk about it with my manager', 'Lead one visible project', 'Collect the results', 'Have the conversation'], keywords: ['work', 'job', 'raise']},
  {id: 'certification', title: 'Earn a certification', area: 'career', kind: 'project', summary: 'Study, practise, pass.', milestones: ['Pick the certificate', 'Finish the course', 'Pass a practice exam', 'Pass the exam'], habits: [h('Study 30 minutes', 'weekdays', 'Half an hour a weekday adds up.')], keywords: ['exam', 'course', 'qualification']},
  {id: 'side-project', title: 'Launch a side project', area: 'career', kind: 'project', summary: 'From idea to something people can use.', milestones: ['Write the idea down', 'A first version', 'First user', 'Launch'], habits: [h('One hour on the project', 'three-a-week', 'Protected time.')], keywords: ['startup', 'business', 'build']},
  {id: 'portfolio-site', title: 'Build a portfolio site', area: 'career', kind: 'project', summary: 'Your work, in one place.', milestones: ['Pick three pieces', 'Write about each', 'Publish'], keywords: ['website', 'cv', 'resume']},
  {id: 'network-12', title: 'Meet 12 people in my field', area: 'career', kind: 'project', summary: 'One new professional conversation a month.', milestones: ['3 people', '6 people', '9 people', '12 people'], keywords: ['networking', 'mentor']},
  {id: 'new-job', title: 'Find a new job', area: 'career', kind: 'project', summary: 'From a clear wish list to a signed offer.', milestones: ['Write my wish list', 'Update my CV', '10 applications', 'First interview', 'Offer signed'], habits: [h('One application or contact', 'weekdays', 'Steady beats bursts.')], keywords: ['career change', 'applications']},
  // Learning
  {id: 'read-12', title: 'Read 12 books', area: 'learning', kind: 'project', summary: 'A book a month for a year.', milestones: ['3 books', '6 books', '9 books', '12 books'], habits: [h('Read 20 pages', 'daily', 'Twenty pages a day is a book a fortnight.')], keywords: ['reading', 'books']},
  {id: 'language', title: 'Learn a language', area: 'learning', kind: 'project', summary: 'From a first lesson to a first conversation.', milestones: ['A first lesson', 'A month of practice', 'A first conversation', 'Read a short article'], habits: [h('Fifteen minutes of practice', 'daily', 'Little and often works best for languages.')], keywords: ['spanish', 'dutch', 'french', 'german', 'lessons']},
  {id: 'online-course', title: 'Finish an online course', area: 'learning', kind: 'project', summary: 'Start to certificate.', milestones: ['Week 1', 'Halfway', 'Final project', 'Certificate'], habits: [h('One lesson', 'weekdays', 'A lesson a weekday.')], keywords: ['course', 'study', 'skills']},
  {id: 'learn-instrument', title: 'Learn an instrument', area: 'learning', kind: 'project', summary: 'From first notes to a first song.', milestones: ['First chords or scales', 'First full song', 'Play for someone'], habits: [h('Practise 20 minutes', 'daily', 'Short daily practice beats long weekly ones.')], keywords: ['guitar', 'piano', 'music']},
  {id: 'learn-to-code', title: 'Learn to code', area: 'learning', kind: 'project', summary: 'Build something small that works.', milestones: ['Finish a beginner course', 'Build a small tool', 'Share it'], habits: [h('Code for 30 minutes', 'weekdays', 'Typing it yourself is how it sticks.')], keywords: ['programming', 'developer']},
  {id: 'chess-rating', title: 'Reach a chess rating', area: 'learning', kind: 'project', summary: 'Your target rating, your steps.', milestones: ['Play 20 rated games', 'Review 10 of my games', 'Reach my target rating'], habits: [h('Solve five puzzles', 'daily', 'Tactics every day.')], keywords: ['chess', 'games']},
  // Fun
  {id: 'trip-new-country', title: 'Visit a new country', area: 'fun', kind: 'project', summary: 'Plan it, book it, go.', milestones: ['Choose the place', 'Book the trip', 'Go'], keywords: ['travel', 'holiday', 'adventure']},
  {id: 'cook-30-recipes', title: 'Cook 30 new recipes', area: 'fun', kind: 'project', summary: 'A new dish most weeks.', milestones: ['10 recipes', '20 recipes', '30 recipes'], keywords: ['cooking', 'food', 'kitchen']},
  {id: 'hike-peaks', title: 'Hike five trails', area: 'fun', kind: 'project', summary: 'Five days outdoors on new trails.', milestones: ['First trail', 'Three trails', 'Five trails'], keywords: ['hiking', 'outdoors', 'nature']},
  {id: 'creative-project', title: 'Finish a creative project', area: 'fun', kind: 'project', summary: 'A painting, a story, a quilt: finished.', milestones: ['Start', 'Halfway', 'Finished', 'Shown to someone'], habits: [h('Create for 20 minutes', 'three-a-week', 'Momentum over perfection.')], keywords: ['art', 'writing', 'craft', 'hobby']},
  {id: 'concerts', title: 'See six live shows', area: 'fun', kind: 'project', summary: 'Music, theatre or comedy, live.', milestones: ['2 shows', '4 shows', '6 shows'], keywords: ['music', 'theatre', 'events']},
  {id: 'photo-a-day', title: 'A photo a day for 100 days', area: 'fun', kind: 'project', summary: 'Look for one good picture every day.', milestones: ['25 photos', '50 photos', '75 photos', '100 photos'], habits: [h('Take today’s photo', 'daily', 'Seeing your day differently.')], keywords: ['photography', 'camera']},
];

export const LIBRARY_AREAS: readonly BuiltInArea[] = ['health', 'mind', 'wealth', 'relationships', 'career', 'learning', 'fun'];
export const templateById = (id: string) => GOAL_LIBRARY.find(t => t.id === id);

/** Search by words in the title, summary, keywords and milestones; every word must match (case and accents ignored). */
export function searchTemplates(query: string, area?: BuiltInArea | null): LibraryTemplate[] {
  const fold = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const words = fold(query).split(/\s+/).filter(Boolean);
  return GOAL_LIBRARY.filter(t => (!area || t.area === area) && words.every(w => fold([t.title, t.summary, ...(t.keywords ?? []), ...(t.milestones ?? [])].join(' ')).includes(w)));
}
