import test from 'node:test';
import assert from 'node:assert/strict';
import {brasiliaDay,compareTaskAttention,deadlineAttention,normalizePriority,priorityPolicy} from '../lib/task-attention.mjs';
const task=(overrides={})=>({id:'a',title:'Estudar',due:'2026-10-08',priority:'normal',done:false,...overrides});

test('deadline messages use calendar days in Brasília, including midnight and leap years',()=>{
  assert.equal(brasiliaDay(new Date('2026-10-09T02:59:59Z')),'2026-10-08');
  assert.equal(brasiliaDay(new Date('2026-10-09T03:00:00Z')),'2026-10-09');
  assert.equal(deadlineAttention(task(),'2026-10-08').message,'Entrega hoje');
  assert.equal(deadlineAttention(task({due:'2026-10-09'}),'2026-10-08').message,'Entrega amanhã');
  assert.equal(deadlineAttention(task({due:'2026-10-06'}),'2026-10-08').message,'');
  assert.equal(deadlineAttention(task({due:'2026-10-07'}),'2026-10-08').message,'');
  assert.equal(deadlineAttention(task({due:'2027-01-01'}),'2026-12-31').days,1);
  assert.equal(deadlineAttention(task({due:'2024-03-01'}),'2024-02-28').days,2);
  for(const due of ['', '2026-02-30','2026-13-01','bad'])assert.equal(deadlineAttention(task({due}),'2026-10-08').reminder,false);
});

test('each priority has a specific inclusive reminder window; overdue has no reminder',()=>{
  for(const [priority,days] of [['baixa',1],['normal',2],['alta',3],['urgente',7]]){
    assert.equal(priorityPolicy[priority].reminderDays,days);
    const due=`2026-10-${String(8+days).padStart(2,'0')}`;
    assert.equal(deadlineAttention(task({priority,due}),'2026-10-08').reminder,true);
    assert.equal(deadlineAttention(task({priority,due:`2026-10-${8+days+1}`}),'2026-10-08').reminder,false);
    assert.equal(deadlineAttention(task({priority,due:'2026-01-01'}),'2026-10-08').reminder,false);
    assert.equal(deadlineAttention(task({priority,due:''}),'2026-10-08').reminder,false);
  }
  assert.equal(normalizePriority('HIGH'),'alta');assert.equal(normalizePriority('URGENT'),'urgente');
  for(const closed of [{done:true},{status:'COMPLETED'},{status:'CANCELLED'}]){
    const result=deadlineAttention(task(closed),'2026-10-08');assert.equal(result.reminder,false);assert.equal(result.message,'');
  }
});

test('attention groups precede importance; ties use priority, then date without mutation',()=>{
  const tasks=[task({id:'far-urgent',priority:'urgente',due:'2026-10-20'}),task({id:'today-low',priority:'baixa'}),
    task({id:'late-low',priority:'baixa',due:'2026-10-07'}),task({id:'near-high',priority:'alta',due:'2026-10-11'}),
    task({id:'tomorrow-urgent',priority:'urgente',due:'2026-10-09'}),task({id:'near-normal',due:'2026-10-10'}),
    task({id:'no-date',priority:'alta',due:''})];
  const before=structuredClone(tasks);
  assert.deepEqual([...tasks].sort((a,b)=>compareTaskAttention(a,b,'2026-10-08')).map(t=>t.id),
    ['late-low','tomorrow-urgent','today-low','near-high','near-normal','far-urgent','no-date']);
  assert.deepEqual(tasks,before);
  assert.ok(compareTaskAttention(task({due:'2026-10-08'}),task({due:'2026-10-09'}),'2026-10-08')<0);
});
