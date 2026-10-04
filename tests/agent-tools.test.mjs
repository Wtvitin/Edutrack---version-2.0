import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/database.mjs';
import { createAgentToolRegistry } from '../server/agent-tools.mjs';

async function fixture() {
  const db = await openDatabase({ directory: 'memory://', url: '' });
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const subjectId = randomUUID();
  const otherSubjectId = randomUUID();
  await db.query("INSERT INTO users(id,name,email,password_hash,updated_at) VALUES($1,'Teste','tools@example.test','hash',now()),($2,'Outro','other-tools@example.test','hash',now())", [userId, otherUserId]);
  await db.query("INSERT INTO subjects(id,user_id,name,color,is_general,updated_at) VALUES($1,$2,'Python','purple',true,now()),($3,$4,'Outro','blue',true,now())", [subjectId, userId, otherSubjectId, otherUserId]);
  return { db, user: { id: userId, name: 'Teste', email: 'tools@example.test', timezone: 'America/Sao_Paulo' }, otherUserId, subjectId };
}

test('registry expõe somente as oito Tools funcionais', () => {
  const registry = createAgentToolRegistry({ readSnapshot: async () => ({ data: { subjects: [], tasks: [], sessions: [] } }), analytics: async () => ({}) });
  assert.deepEqual(registry.list().map(tool => tool.name), ['create_task', 'update_task', 'complete_task', 'get_task', 'list_tasks', 'get_academic_performance', 'get_study_trends', 'get_general_dashboard']);
  assert.equal(registry.has('execute_sql'), false);
});

test('create_task reutiliza ownership e grava AGENT com execution id', async () => {
  const { db, user, subjectId } = await fixture();
  const registry = createAgentToolRegistry({ analytics: async () => ({}) });
  const executionId = randomUUID();
  await db.query("INSERT INTO ai_tool_executions(id,user_id,intent,tool_name,input_json,status) VALUES($1,$2,'write','create_task','{}','PENDING')", [executionId, user.id]);
  const result = await registry.execute('create_task', { subjectId, title: 'Estudar Python' }, { db, user, executionId });
  const row = (await db.query('SELECT created_by,agent_execution_id,status FROM academic_tasks WHERE id=$1', [result.id])).rows[0];
  assert.equal(result.title, 'Estudar Python');
  assert.equal(row.created_by, 'AGENT');
  assert.equal(row.status, 'TODO');
  assert.ok(row.agent_execution_id);
});

test('Tool de tarefa não acessa registro de outra conta', async () => {
  const { db, user, otherUserId } = await fixture();
  const foreignTaskId = randomUUID();
  const foreignSubjectId = (await db.query('SELECT id FROM subjects WHERE user_id=$1', [otherUserId])).rows[0].id;
  await db.query("INSERT INTO academic_tasks(id,user_id,subject_id,title,status,priority,difficulty,updated_at) VALUES($1,$2,$3,'Privada','TODO','MEDIUM','MEDIUM',now())", [foreignTaskId, otherUserId, foreignSubjectId]);
  const registry = createAgentToolRegistry({ analytics: async () => ({}) });
  await assert.rejects(() => registry.execute('get_task', { taskId: foreignTaskId }, { db, user }), error => error.status === 404);
});

test('Tool desconhecida e argumentos inválidos são rejeitados antes do domínio', async () => {
  const { db, user } = await fixture();
  const registry = createAgentToolRegistry({ analytics: async () => ({}) });
  await assert.rejects(() => registry.execute('execute_sql', {}, { db, user }), error => error.code === 'unknown-tool');
  await assert.rejects(() => registry.execute('list_tasks', { userId: randomUUID() }, { db, user }), error => error.code === 'invalid-tool-arguments');
});

test('Tools de analytics usam snapshot autorizado e não exigem userId', async () => {
  const { db, user } = await fixture();
  let received;
  const registry = createAgentToolRegistry({ readSnapshot: async (database, currentUser) => { received = { database, currentUser }; return { data: { subjects: [], tasks: [], sessions: [] } }; }, analytics: async () => ({ completed: 1, pending: 2, overdue: 0, urgent: 1, estimatedMinutes: 30, changePercent: null, days: 7, minutes: 45, previousMinutes: 0, activeDays: 1, sessions: 1, averageSession: 45, daily: [], subjects: [], start: '2026-09-28', end: '2026-10-04' }) });
  const result = await registry.execute('get_academic_performance', {}, { db, user });
  assert.equal(result.completed, 1);
  assert.equal(received.currentUser.id, user.id);
});
