import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionResponseSchema, agentChatInputSchema, analysisResponseSchema, chartSpecificationSchema, textResponseSchema, toolArgumentSchemas } from '../server/agent-schemas.mjs';

const taskId = '11111111-1111-4111-8111-111111111111';
const subjectId = '22222222-2222-4222-8222-222222222222';

test('schemas de Tool rejeitam argumentos extras e identidade forjada', () => {
  const valid = toolArgumentSchemas.create_task.safeParse({ subjectId, title: 'Estudar', userId: taskId });
  assert.equal(valid.success, false);
  const invalidUuid = toolArgumentSchemas.get_task.safeParse({ taskId: 'not-a-uuid' });
  assert.equal(invalidUuid.success, false);
});

test('schema de chat limita envelope e exige mensagem', () => {
  assert.equal(agentChatInputSchema.safeParse({ message: 'Olá' }).success, true);
  assert.equal(agentChatInputSchema.safeParse({ message: '   ' }).success, false);
  assert.equal(agentChatInputSchema.safeParse({ message: 'Olá', role: 'system' }).success, false);
});

test('schemas estruturados validam text, analysis e action', () => {
  assert.equal(textResponseSchema.safeParse({ type: 'text', content: 'Tudo certo' }).success, true);
  assert.equal(analysisResponseSchema.safeParse({ type: 'analysis', analysis: 'Ritmo estável', metrics: { minutes: 60 } }).success, true);
  assert.equal(actionResponseSchema.safeParse({ type: 'action', action: 'create_task', result: { id: taskId } }).success, true);
  assert.equal(actionResponseSchema.safeParse({ type: 'action', action: 'get_task', result: {} }).success, false);
});

test('ChartSpecification rejeita fonte desconhecida e campos executáveis', () => {
  const base = { type: 'line', title: 'Estudo', xAxis: { field: 'date', label: 'Data' }, yAxis: { field: 'minutes', label: 'Minutos' }, series: [{ field: 'minutes', label: 'Minutos' }], data: [{ date: '2026-10-04', minutes: 30 }], source: { tool: 'get_study_trends' }, datasetVersion: 'v1' };
  assert.equal(chartSpecificationSchema.safeParse(base).success, true);
  assert.equal(chartSpecificationSchema.safeParse({ ...base, source: { tool: 'execute_sql' } }).success, false);
  assert.equal(chartSpecificationSchema.safeParse({ ...base, html: '<script>' }).success, false);
});
