import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTasks, csvCell, demoReport, filterCalendarTasks, shiftDay, taskCounts} from '../lib/study-planning.ts';
import {prepareReportAnalytics} from '../server/report-analytics.mjs';
import {snapshotSchema} from '../server/data.mjs';

const task = (overrides = {}) => ({id:'test',title:'Estudar',subjectId:'a',due:'2026-10-01',done:false,priority:'normal',description:'',...overrides});
const fixture = () => ({version:1,profile:{name:'Teste',goal:''},subjects:[{id:'a',name:'Matemática',color:'blue',description:''},{id:'b',name:'História',color:'rose',description:''}],
  sessions:[{id:'s1',subjectId:'a',date:'2026-09-25',minutes:30},{id:'s2',subjectId:'b',date:'2026-10-01',minutes:45},{id:'s3',subjectId:'a',date:'2026-09-24',minutes:15},{id:'s4',subjectId:'a',date:'2026-10-02',minutes:500}],
  tasks:[task({id:'t1',priority:'urgente',due:'2026-09-30',estimatedMinutes:40}),task({id:'t2',done:true,completedAt:'2026-10-02T01:00:00Z',due:'2026-10-01'}),task({id:'t3',subjectId:'b',due:'',priority:'baixa'}),task({id:'t4',status:'CANCELLED',priority:'alta'})]});

test('planejamento exclui canceladas e usa exatamente sete dias', () => {
  const items=[task({due:'2026-10-01'}),task({due:'2026-10-07'}),task({due:'2026-10-08'}),task({due:'2026-09-30'}),task({due:'',priority:'urgente'}),task({status:'CANCELLED'}),task({done:true})];
  assert.deepEqual(taskCounts(items,'2026-10-01'),{pending:5,overdue:1,upcoming:2,urgent:1,withoutDate:1});
  assert.equal(shiftDay('2026-12-31',1),'2027-01-01');assert.equal(shiftDay('2024-03-01',-1),'2024-02-29');
});
test('lista de foco coloca atraso e proximidade primeiro, depois importância', () => {
  const items=[task({id:'normal'}),task({id:'urgent',priority:'urgente',due:'2026-10-05'}),task({id:'overdue',due:'2026-09-30'}),task({id:'high',priority:'alta',due:''})];
  assert.deepEqual(items.sort((a,b)=>compareTasks(a,b,'2026-10-01')).map(t=>t.id),['overdue','normal','urgent','high']);
});
test('calendário combina disciplina, prioridade e situação', () => {
  const items=fixture().tasks;
  assert.deepEqual(filterCalendarTasks(items,{subject:'a',priority:'urgente',status:'pending'}).map(t=>t.id),['t1']);
  assert.deepEqual(filterCalendarTasks(items,{subject:'all',priority:'all',status:'done'}).map(t=>t.id),['t2']);
  assert.equal(filterCalendarTasks(items,{subject:'all',priority:'all',status:'all'}).length,3);
});
test('demonstração respeita Brasília nas conclusões e alinha os períodos', () => {
  const m=demoReport(fixture(),7,'all','2026-10-01');
  assert.equal(m.minutes,75);assert.equal(m.previousMinutes,15);assert.equal(m.completed,1);assert.equal(m.onTimeCompleted,1);assert.equal(m.onTimeRate,100);
  assert.equal(m.unestimatedTasks,1);assert.equal(m.estimatedTasks,1);assert.equal(m.daily[6].previousMinutes,15);assert.equal(m.subjects[0].overdue,1);
});
test('CSV neutraliza fórmulas inclusive com espaços e escapa aspas', () => {
  assert.equal(csvCell(' =HYPERLINK("bad")'),'"\' =HYPERLINK(""bad"")"');
  assert.equal(csvCell('@SUM(1)'),'"\'@SUM(1)"');assert.equal(csvCell('História'),'"História"');
});
test('meta semanal só aceita minutos inteiros no intervalo permitido', () => {
  const snapshot={revision:0,data:{version:1,profile:{name:'Teste',goal:'',weeklyGoalMinutes:300},subjects:[],tasks:[],sessions:[]}};
  assert.ok(snapshotSchema.safeParse(snapshot).success);
  for(const minutes of [-1,10081,2.5]) {snapshot.data.profile.weeklyGoalMinutes=minutes;assert.equal(snapshotSchema.safeParse(snapshot).success,false);}
});
test('Python/Pandas e demonstração concordam sem alterar o Agent', {skip:!process.env.PYTHON_BIN}, async () => {
  for(const subject of ['all','a','b']) {
    const data=fixture(), actual=await prepareReportAnalytics(data,7,subject,{today:'2026-10-01'}), expected=demoReport(data,7,subject,'2026-10-01');
    for(const key of ['minutes','previousMinutes','completed','previousCompleted','pending','overdue','urgent','estimatedMinutes','estimatedTasks','unestimatedTasks','onTimeRate','daily','priorities']) assert.deepEqual(actual[key],expected[key],key);
    for(const s of actual.subjects) {const e=expected.subjects.find(v=>v.id===s.id);for(const key of ['minutes','previousMinutes','completed','sessions','pending','overdue','urgent','estimatedMinutes'])assert.equal(s[key],e[key],key);}
  }
});
test('falha de Python não causa fallback silencioso nem chamadas à IA', async () => {
  await assert.rejects(prepareReportAnalytics(fixture(),7,'all',{python:'edutrack-python-does-not-exist'}));
});
