import {streamAnthropic} from './adapters/anthropic';
import {streamGemini} from './adapters/gemini';
import {streamOllama} from './adapters/ollama';
import {streamOpenAiCompatible} from './adapters/openai-compatible';
import {AiError} from './errors';
import {PROVIDERS, openAiBase} from './providers';
import type {ChatEvent, ChatRequest} from './types';

/** One streaming reply from the person's provider, whichever wire it speaks (ADR-012). The caller renders the events. */
export function streamChat(request: ChatRequest): AsyncGenerator<ChatEvent> {
  const provider = PROVIDERS[request.provider];
  switch (request.provider) {
    case 'anthropic': return streamAnthropic(request, provider.origin);
    case 'gemini': return streamGemini(request, provider.origin);
    case 'openai': return streamOpenAiCompatible(request, 'openai', provider.origin);
    case 'xai': return streamOpenAiCompatible(request, 'xai', provider.origin);
    case 'openrouter': return streamOpenAiCompatible(request, 'openrouter', openAiBase(provider));
    case 'local': {
      if (!request.baseUrl) return failing(new AiError('local-unreachable', 'Enter the local server\'s address first.', {provider: 'local'}));
      return request.localServer === 'ollama' ? streamOllama(request, request.baseUrl) : streamOpenAiCompatible(request, 'local', request.baseUrl);
    }
  }
}
async function* failing(error: AiError): AsyncGenerator<ChatEvent> { throw error; }
/** Session Z-Local Part 3: `cacheWrite` and `cacheRead` appear only when the wire reported them. */
export type Reply = {text: string; usage: {input: number | null; output: number | null; cacheWrite?: number; cacheRead?: number} | null; reason: string | null};
/** Drains a stream into one reply (tests, the connection test's greeting, regenerate). */
export async function collectReply(stream: AsyncIterable<ChatEvent>): Promise<Reply> {
  let text = '', reason: string | null = null;
  const usage = {input: null as number | null, output: null as number | null, cacheWrite: null as number | null, cacheRead: null as number | null, seen: false};
  for await (const event of stream) {
    if (event.type === 'text') text += event.delta;
    else if (event.type === 'usage') { usage.seen = true; if (event.input !== null) usage.input = event.input; if (event.output !== null) usage.output = event.output; if (event.cacheWrite != null) usage.cacheWrite = event.cacheWrite; if (event.cacheRead != null) usage.cacheRead = event.cacheRead; }
    else if (event.type === 'done') reason = event.reason;
  }
  return {text, usage: usage.seen ? {input: usage.input, output: usage.output, ...(usage.cacheWrite !== null ? {cacheWrite: usage.cacheWrite} : {}), ...(usage.cacheRead !== null ? {cacheRead: usage.cacheRead} : {})} : null, reason};
}
