import type {QuickAddLocale} from '../types';

/**
 * The English grammar of the Quick-add line (Session P, PR 3, A2; owner decision P6: English only now). A second
 * language is a second table: the parser reads only this shape. Numbers, units, verbs, day words, a few verb stems
 * for habit titles, the words that carry no meaning, and the three examples shown when a line is not understood.
 */
export const en: QuickAddLocale = {
  numbers: {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, half: 0.5, couple: 2},
  units: {
    glass: 'glass', glasses: 'glass', cup: 'glass', cups: 'glass',
    ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
    l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
    oz: 'floz', floz: 'floz', 'fl.oz': 'floz',
    kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
    step: 'steps', steps: 'steps',
    km: 'km', kilometre: 'km', kilometres: 'km', kilometer: 'km', kilometers: 'km',
    mi: 'mi', mile: 'mi', miles: 'mi',
    min: 'min', mins: 'min', minute: 'min', minutes: 'min',
    h: 'h', hr: 'h', hrs: 'h', hour: 'h', hours: 'h',
  },
  verbs: {
    drank: 'water', drink: 'water', had: 'water', water: 'water',
    weight: 'weight', weigh: 'weight', weighed: 'weight', weighs: 'weight',
    walked: 'walk', walk: 'walk', walking: 'walk', steps: 'walk',
    ran: 'run', run: 'run', running: 'run', jog: 'run', jogged: 'run', jogging: 'run',
    cycled: 'cycle', cycle: 'cycle', cycling: 'cycle', biked: 'cycle', bike: 'cycle', rode: 'cycle',
    swam: 'swim', swim: 'swim', swimming: 'swim',
    slept: 'sleep', sleep: 'sleep',
  },
  dayWords: {today: 'today', yesterday: 'yesterday'},
  stems: {meditated: 'meditate', meditating: 'meditate', walked: 'walk', exercised: 'exercise', exercising: 'exercise', journaled: 'journal', journalled: 'journal', stretched: 'stretch', stretching: 'stretch', studied: 'study', studying: 'study', read: 'read', reading: 'read', practised: 'practise', practiced: 'practice', practising: 'practise', practicing: 'practice'},
  fillers: ['of', 'for', 'in', 'the', 'did', 'do', 'some', 'my', 'a', 'an', 'fl'],
  conjunctions: ['and', '&', 'then', 'plus'],
  examples: ['drank 2 glasses of water', 'weight 78.4', 'ran 5k in 28 min'],
};
