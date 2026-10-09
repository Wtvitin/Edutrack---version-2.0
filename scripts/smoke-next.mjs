import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import {randomBytes} from 'node:crypto';
import {createClassroomCipher} from '../server/classroom.mjs';
import { openDatabase } from '../server/database.mjs';
import { createAPI } from '../server/api.mjs';
import { readAgentConfig } from '../server/agent-config.mjs';

// Production-built Next frontend + real API, but only an in-memory test DB,
// local mailbox and mocked AI. No user data, secrets or Google requests.
const serve = process.argv.includes('--serve');
const dev = process.argv.includes('--dev');
const classroomMock=process.argv.includes('--classroom');
const deadlineMock=process.argv.includes('--deadlines');
const classroomKey=randomBytes(32);
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const uiPort = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), dev ? 'dev' : 'start', '--port', String(uiPort), '--hostname', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
child.stdout.on('data', chunk => process.stdout.write(chunk));
child.stderr.on('data', chunk => process.stderr.write(chunk));
const db = await openDatabase({ url: '', directory: 'memory://' });
let api;
const server = createServer(async (req, res) => {
  if (await api(req, res)) return;
  const proxy = request({ hostname: '127.0.0.1', port: uiPort, path: req.url, method: req.method, headers: req.headers }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  proxy.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('Test UI not ready'); });
  req.pipe(proxy);
});
await new Promise(resolve => server.listen(serve ? 4185 : 0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
api = createAPI(db, {
  origin, local: true, mailMode: 'local', env: {},
  ...(classroomMock?{classroomConfig:{enabled:true,key:classroomKey},classroomTransport:{async fetchImpl(url,options){
    const parsed=new URL(url);
    assert.equal(parsed.origin,'https://classroom.googleapis.com');
    assert.equal(options.method||'GET','GET');
    assert.equal(options.headers.Authorization,'Bearer mock-classroom-only');
    if(parsed.pathname==='/v1/courses')return Response.json({courses:[{id:'testcourse',name:'Classroom de teste',courseState:'ACTIVE'}]});
    assert.equal(parsed.pathname,'/v1/courses/testcourse/courseWork/-/studentSubmissions');
    assert.equal(parsed.searchParams.get('userId'),'me');
    return Response.json({studentSubmissions:[{id:'s1',courseId:'testcourse',courseWorkId:'delivered',state:'TURNED_IN',late:false},{id:'s2',courseId:'testcourse',courseWorkId:'pending',state:'CREATED',late:false}]});
  }}}:{}),
  agentConfig: readAgentConfig({ LLM_PROVIDER: 'openrouter', LLM_MODEL: 'mock', OPENROUTER_API_KEY: 'local-test-only' }),
  agentProvider: { async complete() { return { model: 'mock', content: 'Resposta simulada: a migração mantém o fluxo do agente.' }; } },
});
let closed = false;
async function close() {
  if (closed) return; closed = true;
  child.kill(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); await db.close();
}
process.on('SIGINT', () => void close()); process.on('SIGTERM', () => void close());
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next exited: ${child.exitCode}`);
    try { ready = (await fetch(`http://127.0.0.1:${uiPort}/login`, { signal: AbortSignal.timeout(dev ? 120000 : 5000) })).status === 200; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Next must start from the production build');
  const routes = ['/', '/inicio', '/login', '/cadastro', '/recuperar-senha', '/nova-senha', '/verificar-email', '/privacidade', '/termos', '/emails-locais', '/demo', '/primeiros-passos', '/tarefas', '/disciplinas', '/disciplinas/test', '/calendario', '/sessoes', '/relatorios', '/integracoes', '/agente', '/perfil', '/configuracoes', '/notificacoes', '/historico', '/ajuda'];
  let html;
  for (const route of routes) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const content = await response.text(); assert.ok(content.includes('EduTrack'), route);
    if (route === '/login') html = content;
  }
  for (const route of ['/pagina-inexistente', '/tarefas/rota-invalida']) {
    const response = await fetch(origin + route); assert.equal(response.status, 404, route);
    assert.ok((await response.text()).includes('Vamos encontrar outro caminho'));
  }
  const assets = [...html.matchAll(/(?:src|href)="([^\"]*\/_next\/[^\"]+)"/g)].map(match => match[1]);
  for (const extension of ['.js', '.css']) {
    const asset = assets.find(path => path.includes(extension)); assert.ok(asset, extension);
    const response = await fetch(new URL(asset, origin)); assert.equal(response.status, 200, asset);
    assert.ok((await response.text()).length > 100);
  }
  let cookie = '';
  async function call(path, body, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch(origin + path, {
      method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  assert.equal((await call('/api/data')).status, 401);
  assert.equal((await call('/api/integrations/classroom/status')).status, 401);
  const credentials = { email: 'migration@example.test', password: 'migration-test-only-123' };
  assert.equal((await call('/api/auth/register', { name: 'Validação Next', ...credentials })).status, 200);
  assert.equal((await call('/api/auth/login', credentials)).status, 403);
  const mail = (await call('/api/dev/mail')).body.messages[0];
  assert.equal((await call('/api/auth/verify', { token: new URL(mail.link).searchParams.get('token') })).status, 200);
  const login = await call('/api/auth/login', credentials); assert.equal(login.status, 200);
  assert.ok(login.cookie.includes('HttpOnly')); cookie = login.cookie.split(';')[0];
  assert.equal((await call('/api/auth/session')).status, 200);
  const state = (await call('/api/data')).body;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  state.data.tasks.push({ id: crypto.randomUUID(), title: 'Validar migração Next', subjectId: state.data.subjects[0].id, due: today, done: false, priority: 'urgente', description: 'Registro fictício de validação', estimatedMinutes: 45 });
  state.data.sessions.push({ id: crypto.randomUUID(), subjectId: state.data.subjects[0].id, date: today, minutes: 25 });
  assert.equal((await call('/api/data', state, 'PUT')).status, 200);
  assert.equal((await call('/api/history')).body.items.length, 1);
  assert.equal((await call('/api/notifications')).body.items.length, 1);
  assert.equal((await call('/api/integrations/classroom/status')).status, 200);
  assert.equal((await call('/api/ai/chat', { message: 'Olá' })).status, 200);
  const analytics = await call('/api/analytics?days=7'); assert.equal(analytics.status, 200);
  assert.equal(analytics.body.minutes, 25); assert.equal(analytics.body.pending, 1);
  let changed = (await call('/api/data')).body;
  changed.data.tasks[0].description = 'Atualização validada';
  changed.data.tasks[0].done = true;
  assert.equal((await call('/api/data', changed, 'PUT')).status, 200);
  changed = (await call('/api/data')).body;
  assert.equal(changed.data.tasks[0].description, 'Atualização validada');
  assert.equal(changed.data.tasks[0].done, true); assert.ok(changed.data.tasks[0].completedAt);
  changed.data.tasks[0].done = false; changed.data.tasks[0].status = 'TODO';
  const disposableSubject = crypto.randomUUID(), disposableTask = crypto.randomUUID();
  changed.data.subjects.push({ id: disposableSubject, name: 'Disciplina descartável', color: 'purple', description: '' });
  changed.data.tasks.push({ id: disposableTask, title: 'Tarefa descartável', subjectId: disposableSubject, due: today, done: false, priority: 'normal', description: '' });
  assert.equal((await call('/api/data', changed, 'PUT')).status, 200);
  changed = (await call('/api/data')).body;
  assert.ok(changed.data.subjects.some(subject => subject.id === disposableSubject));
  assert.ok(changed.data.tasks.some(task => task.id === disposableTask));
  changed.data.tasks = changed.data.tasks.filter(task => task.id !== disposableTask);
  changed.data.subjects = changed.data.subjects.filter(subject => subject.id !== disposableSubject);
  assert.equal((await call('/api/data', changed, 'PUT')).status, 200);
  changed = (await call('/api/data')).body;
  assert.equal(changed.data.tasks.length, 1); assert.equal(changed.data.subjects.length, 1);
  const cross = await fetch(origin + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://invalid.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(cross.status, 403);
  await call('/api/auth/logout', {}); assert.equal((await call('/api/data')).status, 401);
  console.log(JSON.stringify({ ok: true, runtime: dev ? 'next dev' : 'next start', pages: routes.length, notFound: 2, assets: 2, api: 'auth, CRUD, history, notifications, analytics, classroom status, mocked agent, CSRF, logout' }));
  if (serve) {
    if(deadlineMock){
      const user=(await db.query('SELECT id FROM users WHERE email=$1',[credentials.email])).rows[0];
      for(const [title,priority,offset] of [['Resumo atrasado','LOW',-2],['Prova amanhã','LOW',1],['Projeto importante','HIGH',3],['Rotina de revisão','MEDIUM',2],['Seminário prioritário','URGENT',7],['Leitura com folga','LOW',10]]){
        const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);
        await db.query('INSERT INTO academic_tasks(user_id,subject_id,title,priority,due_date,updated_at) VALUES($1,$2,$3,$4,$5,now())',
          [user.id,changed.data.subjects[0].id,title,priority,`${date.toISOString().slice(0,10)}T23:59:59-03:00`]);
      }
    }
    if(classroomMock){
      const user=(await db.query('SELECT id FROM users WHERE email=$1',[credentials.email])).rows[0];
      const encrypted=createClassroomCipher(classroomKey).encrypt({accessToken:'mock-classroom-only',refreshToken:'mock-refresh-only',expiresAt:Date.now()+3600000});
      await db.query("INSERT INTO classroom_connections(user_id,tokens_encrypted,selected_course_ids) VALUES($1,$2,'[\"testcourse\"]')",[user.id,encrypted]);
      for(const [workId,title,status] of [['delivered','Trabalho entregue no Classroom','TODO'],['pending','Concluída localmente, ainda não entregue','COMPLETED']]){
        const task=(await db.query('INSERT INTO academic_tasks(user_id,subject_id,title,description,status,updated_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING id',[user.id,changed.data.subjects[0].id,title,'Atividade fictícia para conferir os indicadores independentes.',status])).rows[0];
        await db.query("INSERT INTO classroom_task_links(user_id,course_id,coursework_id,task_id,last_imported) VALUES($1,'testcourse',$2,$3,'{}')",[user.id,workId,task.id]);
      }
    }
    console.log(`Isolated browser test: ${origin}/login | ${credentials.email} | ${credentials.password}`);
    await once(server, 'close');
  }
} finally { await close(); }
