import {expect, test} from 'vitest';
import {anthropicBody} from './adapters/anthropic';
import {geminiBody} from './adapters/gemini';
import {ollamaBody} from './adapters/ollama';
import {openAiBody} from './adapters/openai-compatible';
import {fitWithin, PHOTO_MAX_EDGE, photoAllowance} from './photo';
import type {ChatImage, ChatMessage} from './types';

// Session V Part 7: a meal photo only with a model that reads photos and Health shared; downscaled to 1024 px; sent in
// each wire's documented form (read 2026-10-05) with that one message, and the bodies without a photo stay T's.
const IMAGE: ChatImage = {mime: 'image/jpeg', data: 'MOCKBASE64=='};
const plain = {model: 'mock', system: 'MOCK', maxOutputTokens: 256, messages: [{role: 'user', content: 'Earlier'}, {role: 'assistant', content: 'Sure'}, {role: 'user', content: 'Log this meal'}] as ChatMessage[]};
const withPhoto = {...plain, messages: [...plain.messages.slice(0, 2), {role: 'user', content: 'Log this meal', images: [IMAGE]}] as ChatMessage[]};

test('a photo is offered only for a model that reads photos and with Health shared', () => {
  expect(photoAllowance({capability: null, declared: undefined, healthOpen: true})).toEqual({allowed: false, reason: 'Turn on "This model reads photos" in Settings → ZIGi · your AI if your model does.'});
  expect(photoAllowance({capability: {tools: true, vision: true}, declared: undefined, healthOpen: true})).toEqual({allowed: true});
  expect(photoAllowance({capability: {tools: true, vision: false}, declared: undefined, healthOpen: true})).toEqual({allowed: false, reason: 'Your model does not read photos.'});
  expect(photoAllowance({capability: {tools: true, vision: false}, declared: true, healthOpen: true})).toEqual({allowed: true});
  expect(photoAllowance({capability: {tools: true, vision: true}, declared: undefined, healthOpen: false})).toEqual({allowed: false, reason: 'Meal photos need Health shared with ZIGi (Settings → ZIGi · your AI → Include Health).'});
});
test('downscaling keeps the shape and never enlarges', () => {
  expect(PHOTO_MAX_EDGE).toBe(1024);
  expect(fitWithin(4032, 3024)).toEqual({width: 1024, height: 768}); expect(fitWithin(3024, 4032)).toEqual({width: 768, height: 1024});
  expect(fitWithin(800, 600)).toEqual({width: 800, height: 600}); expect(fitWithin(5000, 10)).toEqual({width: 1024, height: 2});
});
test('each wire carries the photo with the last question only; without one every body is T\'s', () => {
  for (const flavor of ['openai', 'xai', 'openrouter', 'local'] as const) {
    const sent = openAiBody(flavor, withPhoto).messages as Record<string, unknown>[];
    expect(sent.at(-1)).toEqual({role: 'user', content: [{type: 'text', text: 'Log this meal'}, {type: 'image_url', image_url: {url: 'data:image/jpeg;base64,MOCKBASE64=='}}]});
    expect(sent[1]).toEqual({role: 'user', content: 'Earlier'});
    expect(JSON.stringify(openAiBody(flavor, {...plain}))).not.toContain('image');
  }
  expect((anthropicBody(withPhoto).messages as unknown[]).at(-1)).toEqual({role: 'user', content: [{type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: 'MOCKBASE64=='}}, {type: 'text', text: 'Log this meal'}]});
  expect((geminiBody(withPhoto).contents as unknown[]).at(-1)).toEqual({role: 'user', parts: [{inlineData: {mimeType: 'image/jpeg', data: 'MOCKBASE64=='}}, {text: 'Log this meal'}]});
  expect((ollamaBody(withPhoto).messages as unknown[]).at(-1)).toEqual({role: 'user', content: 'Log this meal', images: ['MOCKBASE64==']});
  // The bodies of a conversation without a photo are byte for byte what they were.
  const strip = (m: ChatMessage[]) => m.map(x => x.role === 'user' ? {role: 'user' as const, content: x.content} : x);
  expect(JSON.stringify(anthropicBody({...withPhoto, messages: strip(withPhoto.messages)}))).toBe(JSON.stringify(anthropicBody(plain)));
  expect(JSON.stringify(geminiBody({...withPhoto, messages: strip(withPhoto.messages)}))).toBe(JSON.stringify(geminiBody(plain)));
  expect(JSON.stringify(ollamaBody({...withPhoto, messages: strip(withPhoto.messages)}))).toBe(JSON.stringify(ollamaBody(plain)));
});
