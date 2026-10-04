import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, readAgentConfig } from '../server/agent-config.mjs';

test('agent config usa defaults seguros e limita timeout', () => {
  const config = readAgentConfig({});
  assert.equal(config.provider, 'google-gemini');
  assert.equal(config.model, 'gemini-2.5-flash');
  assert.equal(config.fallbackModel, undefined);
  assert.equal(config.maxIterations, 3);
  assert.equal(config.timeoutMs, 30000);
  assert.equal(config.apiKey, undefined);
  assert.equal(readAgentConfig({ LLM_TIMEOUT_MS: '999999' }).timeoutMs, 120000);
});

test('agent config normaliza Gemini e mantém chave somente no objeto server-side', () => {
  const config = readAgentConfig({ LLM_PROVIDER: 'gemini', GOOGLE_API_KEY: 'server-only', LLM_MODEL: 'gemini-2.5-flash' });
  assert.equal(config.provider, 'google-gemini');
  assert.equal(config.apiKey, 'server-only');
  assert.match(config.baseUrl, /generativelanguage/);
});

test('agent config não carrega fallback OpenRouter quando Gemini é o provider', () => {
  const config = readAgentConfig({ LLM_PROVIDER: 'google-gemini', LLM_FALLBACK_MODEL: 'openrouter/free', GOOGLE_API_KEY: 'server-only' });
  assert.equal(config.provider, 'google-gemini');
  assert.equal(config.fallbackModel, undefined);
  assert.equal(config.apiKey, 'server-only');
});

test('system prompt inclui data e somente disciplinas próprias', () => {
  const prompt = buildSystemPrompt({ date: '2026-10-04', subjects: [{ id: 'subject-1', name: 'Python' }] });
  assert.match(prompt, /2026-10-04/);
  assert.match(prompt, /Python/);
  assert.match(prompt, /nunca execute SQL/i);
  assert.doesNotMatch(prompt, /OPENROUTER_API_KEY/);
});
