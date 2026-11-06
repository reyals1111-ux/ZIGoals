import {describe, expect, test} from 'vitest';
import {buildRangeZip, collectEverything, rangeCsv, readDateRange, RANGE_DATE_COLUMNS, CSV_FILES} from './everything';
import {JOURNAL_KEY} from '../journal/schema';
import {MONEY_LOG_KEY} from '../money-log/schema';
import {ACCOUNTS_KEY} from '../w-device-keys';
import {TASKS_KEY, emptyTasks, tasksSchema} from '../tasks/schema';
import {addTask} from '../tasks/engine';
import {readStoredZip} from './zip-reader';

// Session AL (GAP-175, C-BN-27): an export of one chosen date range (CSV tables only).
const NOW = new Date('2026-11-05T09:00:00.000Z'), AT = '2026-10-01T09:00:00.000Z', APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const entry = (id: string, date: string, text: string) => ({id, date, text, createdAt: `${date}T08:00:00.000Z`});
const journal = {version: 1, entries: [entry('j_sep', '2026-09-30', 'Fictional: September'), entry('j_oct', '2026-10-15', 'Fictional: "quoted",\r\nwith a line break'), entry('j_nov', '2026-11-01', 'Fictional: November')], shareWithAi: false, followUps: true};
const money = (id: string, date: string) => ({id, kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Food & drink', date, createdAt: AT});
const moneyLog = {version: 1, entries: [money('m_sep', '2026-09-29'), money('m_oct', '2026-10-31')], weekStartsOn: 'monday'};
const accounts = {version: 1, items: [
  {id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a01', kind: 'savings', name: 'Fictional savings', currency: 'EUR', snapshots: [{id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a02', date: '2026-08-01', value: '100', decimals: 2}, {id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a03', date: '2026-10-02', value: '200', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT},
  {id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a04', kind: 'cash', name: 'Fictional wallet', currency: 'EUR', snapshots: [], payments: [], createdAt: AT, updatedAt: AT}]};
const tasks = tasksSchema.parse(addTask(emptyTasks(), {title: 'Fictional: old task'}, {id: 'task_a', at: new Date('2026-01-01T09:00:00.000Z'), today: '2026-01-01', allowPast: true}));
const texts = {[JOURNAL_KEY]: JSON.stringify(journal), [MONEY_LOG_KEY]: JSON.stringify(moneyLog), [ACCOUNTS_KEY]: JSON.stringify(accounts), [TASKS_KEY]: JSON.stringify(tasks)};
const OCTOBER = {from: '2026-10-01', through: '2026-10-31'};
const ids = (text: string) => text.split('\r\n').slice(1).map(r => /^"([^"]*)"/.exec(r)?.[1]);

describe('export of one date range', () => {
  test('dated tables keep only the rows in the range (both ends included); a cell with quotes and a line break stays whole', () => {
    const csv = rangeCsv(collectEverything(texts, APP), OCTOBER);
    expect(csv['journal.csv'].split('\r\n')[0]).toBe('"entry_id","date","text","tags","follow_up_question","follow_up_answer","created_at_utc"');
    expect(csv['journal.csv']).toContain('"Fictional: ""quoted"",\r\nwith a line break"');
    expect(csv['journal.csv']).not.toContain('September');
    expect(csv['journal.csv']).not.toContain('November');
    expect(ids(csv['money-log.csv'])).toEqual(['m_oct']);
    // An account's balance outside the range goes; an account with no balance yet is a list row and stays.
    expect(csv['accounts.csv']).toContain('6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a03');
    expect(csv['accounts.csv']).not.toContain('6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a02');
    expect(csv['accounts.csv']).toContain('Fictional wallet');
    // Lists of things come as they are today.
    expect(csv['tasks.csv']).toContain('Fictional: old task');
  });
  test('every dated column named exists in its table; the range must be two days, start on or before end', () => {
    const {csv} = collectEverything({}, APP);
    for (const [name, column] of Object.entries(RANGE_DATE_COLUMNS)) expect(csv[name as typeof CSV_FILES[number]].split('\r\n')[0], name).toContain(`"${column}"`);
    expect(readDateRange('2026-10-01', '2026-10-31')).toEqual(OCTOBER);
    expect(readDateRange('2026-10-31', '2026-10-01')).toBeNull();
    expect(readDateRange('', '2026-10-01')).toBeNull();
    expect(readDateRange('2026-13-01', '2026-13-02')).toBeNull();
  });
  test('the range ZIP holds the README and the CSVs only (no everything.json), named by its dates', () => {
    const zip = buildRangeZip(collectEverything(texts, APP), OCTOBER, {showcase: false, now: NOW});
    expect(zip.name).toBe('zigoals-export-2026-10-01-to-2026-10-31.zip');
    const files = readStoredZip(zip.bytes), text = (name: string) => new TextDecoder().decode(files.find(f => f.name === name)!.data);
    expect(files.map(f => f.name)).toEqual(['README.txt', ...CSV_FILES]);
    const body = files.map(f => new TextDecoder().decode(f.data)).join('\n');
    expect(text('README.txt')).toContain('journal.csv: 1 row\r\n');
    expect(text('README.txt')).toContain('money-log.csv: 1 row\r\n');
    expect(text('README.txt')).toContain('Restore from a backup cannot read it');
    expect(body).not.toContain('September');
  });
});
