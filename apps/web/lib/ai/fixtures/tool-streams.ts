/**
 * Hand-written MOCK tool-call streams for Session V Part 6, one per wire, shaped after the official documentation read
 * 2026-10-05 (research §A1–A7; cited in docs/product/YOUR_AI_V2.md). Every text says MOCK; no real provider answered.
 */
const sse = (lines: string[]) => lines.join('\n') + '\n';
const chunk = (choice: Record<string, unknown>) => `data: ${JSON.stringify({id: 'chatcmpl-MOCK', object: 'chat.completion.chunk', choices: [{index: 0, ...choice}]})}`;
/** OpenAI / OpenRouter / LM Studio: the id, type and name on the first delta, the arguments in fragments merged by index. */
export const OPENAI_TOOL_STREAM = sse([
  chunk({delta: {role: 'assistant', content: null, tool_calls: [{index: 0, id: 'call_MOCK_1', type: 'function', function: {name: 'habit_stats', arguments: ''}}]}, finish_reason: null}), '',
  chunk({delta: {tool_calls: [{index: 0, id: null, function: {arguments: '{"habit":"Medi'}, type: null}]}, finish_reason: null}), '',
  chunk({delta: {tool_calls: [{index: 0, function: {arguments: 'tate","range":"this month","metric":"minutes"}'}}]}, finish_reason: null}), '',
  chunk({delta: {tool_calls: [{index: 1, id: 'call_MOCK_2', type: 'function', function: {name: 'water', arguments: '{"range":"today"}'}}]}, finish_reason: null}), '',
  chunk({delta: {}, finish_reason: 'tool_calls'}), '',
  'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":300,"completion_tokens":40,"total_tokens":340}}', '',
  'data: [DONE]', '',
]);
/** xAI: "the function call is returned in whole in a single chunk". */
export const XAI_TOOL_STREAM = sse([
  chunk({delta: {role: 'assistant', tool_calls: [{index: 0, id: 'call_MOCK_X', type: 'function', function: {name: 'list_habits', arguments: '{}'}}]}, finish_reason: 'tool_calls'}), '',
  'data: [DONE]', '',
]);
/** A call whose arguments are not JSON, and one for a tool that does not exist. */
export const OPENAI_BAD_TOOL_STREAM = sse([
  chunk({delta: {tool_calls: [{index: 0, id: 'call_MOCK_BAD', type: 'function', function: {name: 'habit_stats', arguments: '{"habit": Meditate'}}]}, finish_reason: null}), '',
  chunk({delta: {tool_calls: [{index: 1, id: 'call_MOCK_UNKNOWN', type: 'function', function: {name: 'delete_everything', arguments: '{}'}}]}, finish_reason: 'tool_calls'}), '',
  'data: [DONE]', '',
]);
/** Anthropic: a text block, then a tool_use block whose input arrives as partial JSON; stop_reason tool_use. */
export const ANTHROPIC_TOOL_STREAM = sse([
  'event: message_start', 'data: {"type":"message_start","message":{"id":"msg_MOCK","type":"message","role":"assistant","content":[],"model":"mock-model","stop_reason":null,"usage":{"input_tokens":310,"output_tokens":1}}}', '',
  'event: content_block_start', 'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"MOCK: let me look that up."}}', '',
  'event: content_block_stop', 'data: {"type":"content_block_stop","index":0}', '',
  'event: content_block_start', 'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_MOCK_1","name":"habit_stats","input":{}}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":""}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"habit\\": \\"Meditate\\", "}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\\"range\\": \\"this month\\", \\"metric\\": \\"minutes\\"}"}}', '',
  'event: content_block_stop', 'data: {"type":"content_block_stop","index":1}', '',
  'event: message_delta', 'data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":89}}', '',
  'event: message_stop', 'data: {"type":"message_stop"}', '',
]);
/** Gemini: the call arrives whole as a functionCall part carrying a thought signature that must be echoed back. */
export const GEMINI_TOOL_STREAM = sse([
  'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"habit_stats","args":{"habit":"Meditate","range":"this month","metric":"minutes"}},"thoughtSignature":"MOCK-SIGNATURE-1"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":290,"candidatesTokenCount":12,"totalTokenCount":302}}', '',
]);
/** Ollama: the call arrives whole in message.tool_calls, its arguments an object. */
export const OLLAMA_TOOL_STREAM = [
  '{"model":"mock-model","message":{"role":"assistant","content":"","tool_calls":[{"type":"function","function":{"index":0,"name":"habit_stats","arguments":{"habit":"Meditate","range":"this month","metric":"minutes"}}}]},"done":false}',
  '{"model":"mock-model","message":{"role":"assistant","content":""},"done_reason":"stop","done":true,"prompt_eval_count":200,"eval_count":20}',
].join('\n') + '\n';
/** The answer after the results: plain text, the usual way. */
export const OPENAI_ANSWER_STREAM = (text: string) => sse([chunk({delta: {role: 'assistant', content: text}, finish_reason: null}), '', chunk({delta: {}, finish_reason: 'stop'}), '', 'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":520,"completion_tokens":30,"total_tokens":550}}', '', 'data: [DONE]', '']);
