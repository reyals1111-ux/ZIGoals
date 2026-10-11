/**
 * Hand-written provider answers for the unit tests (ADR-012, Part 1). Every text carries the word MOCK so no fixture
 * can be mistaken for a real provider's output; every key is an obvious fake. Shapes follow the official documentation
 * read 2026-10-04 (docs/product/YOUR_AI_V1.md §1).
 */
export const FAKE_KEY = 'sk-test-FAKE-0000000000000000';
const sse = (lines: string[]) => lines.join('\n') + '\n';
/** OpenAI Chat Completions: role chunk, text deltas (one with a multi-byte character), finish, the usage chunk, [DONE]. */
export const OPENAI_STREAM = sse([
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}', '',
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"MOCK reply"},"finish_reason":null}]}', '',
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" ✓ from OpenAI"},"finish_reason":null}]}', '',
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}', '',
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":120,"completion_tokens":7,"total_tokens":127}}', '',
  'data: [DONE]', '',
]);
/** OpenRouter: keep-alive comments the reader must ignore, then the same shape. */
export const OPENROUTER_STREAM = sse([
  ': OPENROUTER PROCESSING', '',
  'data: {"id":"gen-MOCK","choices":[{"index":0,"delta":{"role":"assistant","content":"MOCK reply via OpenRouter"},"finish_reason":null}]}', '',
  ': OPENROUTER PROCESSING', '',
  'data: {"id":"gen-MOCK","choices":[{"index":0,"delta":{"content":""},"finish_reason":"stop"}]}', '',
  'data: {"id":"gen-MOCK","choices":[],"usage":{"prompt_tokens":80,"completion_tokens":5,"total_tokens":85}}', '',
  'data: [DONE]', '',
]);
/** OpenRouter: an error after the 200 headers were sent (HTTP stays 200). */
export const OPENROUTER_MIDSTREAM_ERROR = sse([
  'data: {"id":"gen-MOCK","choices":[{"index":0,"delta":{"content":"MOCK partial"},"finish_reason":null}]}', '',
  'data: {"id":"gen-MOCK","error":{"code":402,"message":"Insufficient credits (MOCK)","metadata":{"provider_name":"MOCK"}},"choices":[{"index":0,"delta":{},"finish_reason":"error"}]}', '',
  'data: [DONE]', '',
]);
/** Anthropic Messages: the documented event sequence, usage split across message_start and message_delta. */
export const ANTHROPIC_STREAM = sse([
  'event: message_start', 'data: {"type":"message_start","message":{"id":"msg_MOCK","type":"message","role":"assistant","content":[],"model":"mock-model","stop_reason":null,"usage":{"input_tokens":25,"output_tokens":1}}}', '',
  'event: content_block_start', 'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}', '',
  'event: ping', 'data: {"type":"ping"}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"MOCK reply"}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" from Anthropic ✓"}}', '',
  'event: content_block_stop', 'data: {"type":"content_block_stop","index":0}', '',
  'event: message_delta', 'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":9}}', '',
  'event: message_stop', 'data: {"type":"message_stop"}', '',
]);
export const ANTHROPIC_ERROR_EVENT = sse([
  'event: message_start', 'data: {"type":"message_start","message":{"id":"msg_MOCK","type":"message","role":"assistant","content":[],"model":"mock-model","stop_reason":null,"usage":{"input_tokens":25,"output_tokens":1}}}', '',
  'event: error', 'data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded (MOCK)"}}', '',
]);
/** Gemini streamGenerateContent with alt=sse: each payload is a GenerateContentResponse. */
export const GEMINI_STREAM = sse([
  'data: {"candidates":[{"content":{"parts":[{"text":"MOCK reply"}],"role":"model"},"index":0}],"usageMetadata":{"promptTokenCount":40,"candidatesTokenCount":2,"totalTokenCount":42},"modelVersion":"mock-model"}', '',
  'data: {"candidates":[{"content":{"parts":[{"text":" from Gemini ✓"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":40,"candidatesTokenCount":6,"totalTokenCount":46},"modelVersion":"mock-model"}', '',
]);
export const GEMINI_BLOCKED = sse(['data: {"promptFeedback":{"blockReason":"SAFETY","safetyRatings":[]},"usageMetadata":{"promptTokenCount":40,"totalTokenCount":40}}', '']);
/** Ollama /api/chat: one JSON object per line; the last carries the counts. */
export const OLLAMA_STREAM = [
  '{"model":"mock-model","created_at":"2026-10-04T10:00:00Z","message":{"role":"assistant","content":"MOCK reply"},"done":false}',
  '{"model":"mock-model","created_at":"2026-10-04T10:00:00Z","message":{"role":"assistant","content":" from Ollama ✓"},"done":false}',
  '{"model":"mock-model","created_at":"2026-10-04T10:00:01Z","message":{"role":"assistant","content":""},"done_reason":"stop","done":true,"total_duration":1000,"prompt_eval_count":30,"eval_count":6}',
].join('\n') + '\n';
export const OLLAMA_MODEL_ERROR = '{"error":"model \'mock-missing\' not found, try pulling it first"}\n';
/** Error bodies, as the documentation and live answers shape them. The fake key inside is what scrubbing must remove. */
export const ERROR_BODIES = {
  openai401: {status: 401, body: `{"error":{"message":"Incorrect API key provided: ${FAKE_KEY}. You can find your API key at https://platform.openai.com/account/api-keys.","type":"invalid_request_error","param":null,"code":"invalid_api_key"}}`},
  openai429quota: {status: 429, body: '{"error":{"message":"You exceeded your current quota, please check your plan and billing details.","type":"insufficient_quota","param":null,"code":"insufficient_quota"}}'},
  openai429credit: {status: 429, body: '{"error":{"message":"Your organization has no prepaid credits remaining.","type":"insufficient_quota","param":null,"code":"credit_balance_exhausted"}}'},
  openai429rate: {status: 429, body: '{"error":{"message":"Rate limit reached for requests","type":"requests","param":null,"code":"rate_limit_exceeded"}}', headers: {'retry-after': '20'}},
  openai404model: {status: 404, body: '{"error":{"message":"The model `mock-missing` does not exist or you do not have access to it.","type":"invalid_request_error","param":null,"code":"model_not_found"}}'},
  openai503: {status: 503, body: '{"error":{"message":"The server is overloaded (MOCK)","type":"server_error","param":null,"code":"server_is_overloaded"}}', headers: {'retry-after': '5'}},
  anthropic401: {status: 401, body: '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_MOCK"}'},
  anthropic402: {status: 402, body: '{"type":"error","error":{"type":"billing_error","message":"Your credit balance is too low (MOCK)."},"request_id":"req_MOCK"}'},
  anthropic429: {status: 429, body: '{"type":"error","error":{"type":"rate_limit_error","message":"Number of request tokens has exceeded your per-minute rate limit (MOCK)."},"request_id":"req_MOCK"}', headers: {'retry-after': '30'}},
  anthropic529: {status: 529, body: '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"},"request_id":"req_MOCK"}'},
  gemini403: {status: 403, body: '{"error":{"code":403,"message":"Method doesn\'t allow unregistered callers (callers without established identity). Please use API Key or other form of API consumer identity to call this API.","status":"PERMISSION_DENIED"}}'},
  gemini404: {status: 404, body: '[{"error":{"code":404,"message":"models/mock-missing is not found for API version v1beta, or is not supported for generateContent.","status":"NOT_FOUND"}}]'},
  gemini429: {status: 429, body: '{"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}'},
  openrouter401: {status: 401, body: '{"error":{"code":401,"message":"No auth credentials found"}}'},
  openrouter402: {status: 402, body: '{"error":{"code":402,"message":"Insufficient credits. Add more using https://openrouter.ai/settings/credits"}}'},
  openrouter503: {status: 503, body: '{"error":{"code":503,"message":"No available model provider meets your routing requirements (MOCK)"}}'},
  ollama404: {status: 404, body: OLLAMA_MODEL_ERROR},
  lmstudio401: {status: 401, body: '{"error":"Unauthorized (MOCK)"}'},
  plainText500: {status: 500, body: '<html>Bad gateway (MOCK)</html>'},
} as const;
/** Model lists, in each provider's documented shape. */
export const MODEL_LISTS = {
  openai: {object: 'list', data: [{id: 'mock-chat-1', object: 'model', created: 1, owned_by: 'mock'}, {id: 'whisper-1', object: 'model', created: 1, owned_by: 'mock'}, {id: 'mock-transcribe', object: 'model', created: 1, owned_by: 'mock'}, {id: 'text-embedding-mock', object: 'model', created: 1, owned_by: 'mock'}, {id: 'dall-e-mock', object: 'model', created: 1, owned_by: 'mock'}, {id: 'mock-chat-1', object: 'model', created: 1, owned_by: 'mock'}]},
  anthropic: {data: [{type: 'model', id: 'mock-claude-a', display_name: 'Mock Claude A', created_at: '2026-01-01T00:00:00Z'}, {type: 'model', id: 'mock-claude-b', display_name: 'Mock Claude B', created_at: '2026-01-01T00:00:00Z'}], has_more: false, first_id: 'mock-claude-a', last_id: 'mock-claude-b'},
  geminiPage1: {models: [{name: 'models/mock-gemini-chat', displayName: 'Mock Gemini Chat', supportedGenerationMethods: ['generateContent', 'countTokens']}, {name: 'models/mock-embedding', displayName: 'Mock Embedding', supportedGenerationMethods: ['embedContent']}], nextPageToken: 'MOCK-PAGE-2'},
  geminiPage2: {models: [{name: 'models/mock-gemini-image', displayName: 'Mock Image', supportedGenerationMethods: ['generateContent']}, {name: 'models/mock-gemini-chat-2', displayName: 'Mock Gemini Chat 2', supportedGenerationMethods: ['generateContent']}]},
  openrouter: {data: [{id: 'mock/chat-model', name: 'Mock Chat', architecture: {input_modalities: ['text', 'image'], output_modalities: ['text']}}, {id: 'mock/image-model', name: 'Mock Image', architecture: {input_modalities: ['text'], output_modalities: ['image']}}, {id: 'mock/legacy', name: 'Mock Legacy'}]},
  ollama: {models: [{name: 'mock-llama:8b', model: 'mock-llama:8b', size: 1}, {name: 'mock-embed:latest', model: 'mock-embed:latest', size: 1}]},
  lmstudio: {object: 'list', data: [{id: 'mock-local-chat', object: 'model', owned_by: 'organization_owner'}, {id: 'text-embedding-mock-local', object: 'model', owned_by: 'organization_owner'}]},
} as const;
