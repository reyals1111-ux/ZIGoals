import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {parseReply} from '../actions/parse';
import {buildSystemParts} from '../context/specialists';
import {listModels} from '../models';
import {PHOTO_NOTE} from '../photo';
import {estimateCost, PRICES_AS_OF} from '../pricing';
import type {ChatEvent} from '../types';
import {DAY} from '../tools/fixtures';
import {BatchQueue} from './batch-transport';
import {readKeyFile} from './key-file';

/**
 * Session AI (Track A, owner amendment 2d and the owner's photo addition): meal photos through the app's own photo
 * prompt (`PHOTO_NOTE` on the Health page's system prompt, Health shared, the photo at the app's 1,024 px) to a real
 * Claude model, through the Message Batches API. The photos live outside the repository (ZIGI_PHOTOS: the folder with
 * `plates.json`, `SOURCES.md` and the 1,024 px copies in `1024/`): real photos (downloaded, licence recorded), never
 * committed. Each photo is asked in English ("What is on this plate? Log it as lunch.") and in Dutch.
 * Scored per photo, English: a food photo gets at least one log-food card, at least half of the items on the plate
 * named (one for a hard photo: blurry, crowded or partly eaten), no card for an item that is not there, and the
 * packaged product's own name; the non-food photo gets no card and says it is not food. Dutch: the same cards and
 * refusals (item words are not translated, so recognition is scored in English only).
 *   ZIGI_REAL_MODEL=1 ZIGI_MODEL=claude-sonnet-5-5 ZIGI_PHOTOS=<folder> ZIGI_OUT=<runs>/real-model/photos pnpm exec vitest run apps/web/lib/ai/evals/photo-model.test.ts
 */
const env = process.env, enabled = env.ZIGI_REAL_MODEL === '1' && !!env.ZIGI_PHOTOS && !!env.ZIGI_MODEL;
const MODEL = env.ZIGI_MODEL ?? '', DIR = env.ZIGI_PHOTOS ?? '', OUT = env.ZIGI_OUT ?? '', CAP = Number(env.ZIGI_MAX_USD ?? '1');
type Plate = {file: string; category: string; isFood: boolean; expectedItems: string[]; mayAlsoSee: string[]; notOnPlate: string[]; packagedLabelText: string | null; hard: boolean};
const ASK = {en: 'What is on this plate? Log it as lunch.', nl: 'Wat staat er op dit bord? Log het als lunch.'} as const;
const NOT_FOOD = /\b(not (?:a |any )?(?:food|meal|dish)|no (?:food|meal)|isn'?t (?:food|a meal)|geen (?:eten|voedsel|maaltijd|gerecht)|niet eetbaar|geen etenswaren)\b/i;
const mentions = (text: string, item: string) => text.toLowerCase().includes(item.toLowerCase());

describe.skipIf(!enabled)('meal photos against a real model (owner machines only)', () => {
  test(`photos on ${MODEL}`, async () => {
    const key = env.ANTHROPIC_TEST_KEY || readKeyFile();
    const ids = (await listModels({provider: 'anthropic', key})).map(m => m.id);
    if (!ids.includes(MODEL)) throw new Error(`Model ${MODEL} is not in the key's model list.`);
    const plates = JSON.parse(readFileSync(join(DIR, 'plates.json'), 'utf8')) as Plate[];
    const parts = buildSystemParts({area: 'health', context: null, customInstructions: '', providerName: 'Anthropic', tools: false, today: DAY, healthShared: true, pageContext: null});
    const system = `${parts.prompt}\n\n${PHOTO_NOTE}`;
    mkdirSync(OUT, {recursive: true});
    const queue = new BatchQueue({key, model: MODEL, capUsd: CAP, forecastPerRequest: estimateCost(MODEL, {input: 4_000, output: 500, cacheWrite: 0, cacheRead: 0}, {batch: true}) ?? 0, log: line => console.info(line), recordDir: join(OUT, 'batches')});
    const startedAt = new Date().toISOString();
    const runOne = async (plate: Plate, lang: 'en' | 'nl') => {
      const path = join(DIR, '1024', plate.file);
      const data = readFileSync(existsSync(path) ? path : join(DIR, plate.file)).toString('base64');
      queue.enter();
      let reply = '', tokens = {input: 0, output: 0, cacheWrite: 0, cacheRead: 0}, error: string | null = null;
      try {
        for await (const e of queue.stream({provider: 'anthropic', model: MODEL, system, messages: [{role: 'user', content: ASK[lang], images: [{mime: 'image/jpeg', data}]}], maxOutputTokens: 1024, key}) as AsyncGenerator<ChatEvent>) {
          if (e.type === 'text') reply += e.delta;
          else if (e.type === 'usage') tokens = {input: e.input ?? 0, output: e.output ?? 0, cacheWrite: e.cacheWrite ?? 0, cacheRead: e.cacheRead ?? 0};
        }
      } catch (e) { error = e instanceof Error ? e.message : String(e); } finally { queue.leave(); }
      const parsed = parseReply(reply), foods = parsed.proposals.filter(p => p.kind === 'log-food');
      const names = foods.map(p => String((p as {name?: string}).name ?? '')).join(' | '), seen = `${reply}\n${names}`;
      const checks: {name: string; pass: boolean; detail?: string}[] = [];
      if (!plate.isFood) {
        checks.push({name: 'no-card', pass: parsed.proposals.length === 0, detail: `${parsed.proposals.length} cards`});
        checks.push({name: 'says-not-food', pass: NOT_FOOD.test(reply)});
      } else {
        checks.push({name: 'cards', pass: foods.length >= 1, detail: `${foods.length} log-food cards`});
        const invented = plate.notOnPlate.filter(item => mentions(names, item));
        checks.push({name: 'nothing-invented', pass: invented.length === 0, detail: invented.join(', ')});
        if (lang === 'en' && plate.expectedItems.length) {
          const found = plate.expectedItems.filter(item => mentions(seen, item) || item.split(' ').some(w => w.length >= 5 && mentions(seen, w)));
          const need = plate.hard ? 1 : Math.ceil(plate.expectedItems.length / 2);
          checks.push({name: 'recognised', pass: found.length >= need, detail: `${found.length}/${plate.expectedItems.length} (need ${need})`});
        }
        if (plate.packagedLabelText) checks.push({name: 'label-read', pass: /biobio|dinkel/i.test(seen)});
      }
      const pass = !error && checks.every(c => c.pass);
      const costUsd = estimateCost(MODEL, tokens, {batch: true});
      console.info(`${pass ? 'PASS' : 'FAIL'} ${plate.file} ${lang} $${(costUsd ?? 0).toFixed(4)} ${checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}${error ? ` ERROR ${error.slice(0, 80)}` : ''}`);
      return {id: `photo-${plate.file.replace(/\.\w+$/, '')}-${lang}`, file: plate.file, category: plate.category, lang, hard: plate.hard, isFood: plate.isFood, pass, checks, cards: foods.length, tokens, costUsd, reply: reply.slice(0, 3000), error, kind: plate.isFood ? (plate.hard ? 'photo-hard' : 'photo') : 'photo-not-food', turn: 0, requests: 1};
    };
    const runs = await Promise.all(plates.flatMap(p => [runOne(p, 'en'), runOne(p, 'nl')]));
    const passed = runs.filter(r => r.pass).length;
    const summary = {provider: 'anthropic', model: MODEL, set: 'photos', mode: 'attach', photos: 'real photos (downloaded, licence recorded)', batch: true, costCountedIn: 'batches', startedAt, finishedAt: new Date().toISOString(), cases: runs.length, runs: runs.length, passed, rate: passed / runs.length, pricesAsOf: PRICES_AS_OF, batches: queue.batches};
    const file = join(OUT, `anthropic-${MODEL}-photos-${startedAt.replace(/[:.]/g, '-')}.json`);
    writeFileSync(file, JSON.stringify({summary, runs}, null, 1));
    console.info(`ZIGi photos: ${passed}/${runs.length} on ${MODEL}; written to ${file}`);
    expect(runs.length).toBeGreaterThan(0);
  }, 6 * 60 * 60 * 1000);
});
