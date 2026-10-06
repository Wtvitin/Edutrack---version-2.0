import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAgentConfig } from '../server/agent-config.mjs';
import { AgentProviderError, createAgentProvider } from '../server/agent-provider.mjs';

function config(overrides = {}) {
  return { ...readAgentConfig({ LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-key', LLM_MODEL: 'primary', LLM_FALLBACK_MODEL: 'fallback', LLM_TIMEOUT_MS: '1000' }), ...overrides };
}

test('OpenRouter envia Tools e interpreta resposta final', async () => {
  const requests = [];
  const transport = { async post(url, headers, body) { requests.push({ url, headers, body }); return { status: 200, body: { choices: [{ message: { content: 'Olá estudante' } }], usage: { prompt_tokens: 2 } } }; } };
  const provider = createAgentProvider(config(), transport);
  const result = await provider.complete({ model: 'primary', messages: [{ role: 'user', content: 'Olá' }], tools: [{ name: 'list_tasks', description: 'lista', parameters: { type: 'object' } }] });
  assert.equal(result.content, 'Olá estudante');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.tools[0].function.name, 'list_tasks');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-key');
});

test('OpenRouter interpreta Tool Call e faz retry transitório', async () => {
  let attempts = 0;
  const transport = { async post() { attempts += 1; if (attempts === 1) return { status: 503, body: {} }; return { status: 200, body: { choices: [{ message: { content: null, tool_calls: [{ id: 'call-1', function: { name: 'get_task', arguments: '{"taskId":"11111111-1111-4111-8111-111111111111"}' } }] } }] } }; } };
  const provider = createAgentProvider(config({ fallbackModel: undefined }), transport);
  const result = await provider.complete({ model: 'primary', messages: [{ role: 'user', content: 'tarefa' }] });
  assert.equal(attempts, 2);
  assert.deepEqual(result.toolCalls, [{ id: 'call-1', name: 'get_task', arguments: { taskId: '11111111-1111-4111-8111-111111111111' } }]);
});

test('OpenRouter preserva argumentos JSON malformados para rejeição server-side', async () => {
  const transport = { async post() { return { status: 200, body: { choices: [{ message: { content: null, tool_calls: [{ id: 'bad-1', function: { name: 'get_task', arguments: '{invalid' } }] } }] } }; } };
  const provider = createAgentProvider(config(), transport);
  const result = await provider.complete({ model: 'primary', messages: [{ role: 'user', content: 'tarefa' }] });
  assert.equal(result.toolCalls[0].arguments, null);
});

test('OpenRouter usa fallback após duas falhas do modelo primário', async () => {
  const models = [];
  const transport = { async post(url, headers, body) { models.push(body.model); if (body.model === 'primary') return { status: 503, body: {} }; return { status: 200, body: { choices: [{ message: { content: 'fallback ok' } }] } }; } };
  const provider = createAgentProvider(config(), transport);
  const result = await provider.complete({ model: 'primary', messages: [{ role: 'user', content: 'oi' }] });
  assert.equal(result.content, 'fallback ok');
  assert.deepEqual(models, ['primary', 'primary', 'fallback']);
});

test('Provider sem chave falha sem chamada externa', async () => {
  let called = false;
  const provider = createAgentProvider(config({ apiKey: undefined }), { async post() { called = true; return { status: 200, body: {} }; } });
  await assert.rejects(() => provider.complete({ model: 'primary', messages: [] }), error => error instanceof AgentProviderError && error.code === 'provider-not-configured');
  assert.equal(called, false);
});

test('Gemini sem chave falha sem acessar a rede ou OpenRouter', async () => {
  let called = false;
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: undefined }), { async post() { called = true; return { status: 200, body: {} }; } });
  await assert.rejects(() => provider.complete({ model: 'gemini-2.5-flash', messages: [] }), error => error instanceof AgentProviderError && error.code === 'provider-not-configured');
  assert.equal(called, false);
});

test('Gemini traduz resposta de function call', async () => {
  const transport = { async post(url, headers, body) { assert.match(url, /generateContent$/); assert.equal(headers['x-goog-api-key'], 'gemini-key'); assert.doesNotMatch(url, /gemini-key/); assert.equal(body.tools[0].functionDeclarations[0].name, 'get_task'); assert.equal(body.systemInstruction.parts[0].text, 'System prompt'); return { status: 200, body: { candidates: [{ content: { parts: [{ functionCall: { name: 'get_task', args: { taskId: '11111111-1111-4111-8111-111111111111' } } }] } }] } }; } };
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: 'gemini-key', baseUrl: 'https://gemini.test/models' }), transport);
  const result = await provider.complete({ model: 'gemini-model', messages: [{ role: 'system', content: 'System prompt' }, { role: 'user', content: 'tarefa' }], tools: [{ name: 'get_task', description: 'tarefa', parameters: { type: 'object' } }] });
  assert.equal(result.toolCalls[0].name, 'get_task');
});

test('Gemini adapta schema JSON das Tools ao formato aceito pelo endpoint', async () => {
  let request;
  const transport = { async post(url, headers, body) { request = body; return { status: 200, body: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] } }; } };
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: 'gemini-key', baseUrl: 'https://gemini.test/models' }), transport);
  await provider.complete({ model: 'gemini-model', messages: [{ role: 'user', content: 'tarefa' }], tools: [{ name: 'create_task', description: 'cria', parameters: { type: 'object', additionalProperties: false, properties: { dueDate: { type: ['string', 'null'] } } } }] });
  assert.equal(request.tools[0].functionDeclarations[0].parameters.additionalProperties, undefined);
  assert.deepEqual(request.tools[0].functionDeclarations[0].parameters.properties.dueDate, { type: 'string' });
});

test('Gemini envia Structured Output sem usar OpenRouter', async () => {
  const requests = [];
  const transport = { async post(url, headers, body) { requests.push({ url, headers, body }); return { status: 200, body: { candidates: [{ content: { parts: [{ text: '{type:text,content:ok}' }] } }] } }; } };
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: 'gemini-key', baseUrl: 'https://gemini.test/models' }), transport);
  await provider.complete({ model: 'gemini-model', messages: [{ role: 'user', content: 'oi' }], responseFormat: { name: 'agent_response', schema: { type: 'object', properties: { type: { type: 'string' } }, required: ['type'] } } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(requests[0].body.generationConfig.responseSchema, { type: 'object', properties: { type: { type: 'string' } }, required: ['type'] });
  assert.doesNotMatch(requests[0].url, /openrouter/);
});

test('Gemini remove campos JSON Schema não suportados no Structured Output', async () => {
  let request;
  const transport = { async post(url, headers, body) { request = body; return { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"type":"analysis"}' }] } }] } }; } };
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: 'gemini-key', baseUrl: 'https://gemini.test/models' }), transport);
  await provider.complete({ model: 'gemini-model', messages: [{ role: 'user', content: 'oi' }], responseFormat: { name: 'agent_analysis_response_v1', schema: { type: 'object', additionalProperties: false, properties: { metadata: { type: 'object', additionalProperties: true }, count: { type: 'integer', minimum: 1, maximum: 500 }, items: { type: 'array', minItems: 1, maxItems: 500, items: { type: 'string' } } } } } });
  assert.equal(request.generationConfig.responseSchema.additionalProperties, undefined);
  assert.equal(request.generationConfig.responseSchema.properties.metadata.additionalProperties, undefined);
  assert.deepEqual(request.generationConfig.responseSchema.properties.count, { type: 'integer' });
  assert.deepEqual(request.generationConfig.responseSchema.properties.items, { type: 'array', items: { type: 'string' } });
});

test('falha Gemini não chama fallback OpenRouter', async () => {
  let calls = 0;
  const transport = { async post() { calls += 1; return { status: 503, body: {} }; } };
  const provider = createAgentProvider(config({ provider: 'google-gemini', apiKey: 'gemini-key', fallbackModel: 'openrouter/free' }), transport);
  await assert.rejects(() => provider.complete({ model: 'gemini-model', messages: [{ role: 'user', content: 'oi' }] }), error => {
    assert.ok(error instanceof AgentProviderError);
    assert.equal(error.code, 'provider-http-error');
    assert.equal(error.providerStatus, 503);
    return true;
  });
  assert.equal(calls, 2);
});
