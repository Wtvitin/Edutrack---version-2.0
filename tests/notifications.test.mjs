import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/database.mjs';
import {readNotifications} from '../server/notifications.mjs';

test('deadline reminders persist once, isolate accounts and follow deadline/priority/lifecycle changes',async()=>{
  const db=await openDatabase({directory:'memory://',url:''}),now=new Date('2026-10-08T21:00:00Z');
  const user={id:randomUUID()},other={id:randomUUID()},subject=randomUUID();
  try{
    for(const u of [user,other])await db.query('INSERT INTO users(id,name,email,password_hash,updated_at) VALUES($1,$2,$3,$4,now())',[u.id,'Teste',`${u.id}@example.test`,'test-only']);
    await db.query('INSERT INTO subjects(id,user_id,name,updated_at) VALUES($1,$2,$3,now())',[subject,user.id,'Estudo']);
    const ids={};
    async function add(title,priority,due,status='TODO'){
      const id=randomUUID();ids[title]=id;
      await db.query('INSERT INTO academic_tasks(id,user_id,subject_id,title,priority,due_date,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())',
        [id,user.id,subject,title,priority,due?`${due}T23:59:59-03:00`:null,status]);
    }
    await add('low','LOW','2026-10-09');await add('low-out','LOW','2026-10-10');
    await add('normal','MEDIUM','2026-10-10');await add('normal-out','MEDIUM','2026-10-11');
    await add('high','HIGH','2026-10-11');await add('high-out','HIGH','2026-10-12');
    await add('urgent','URGENT','2026-10-15');await add('urgent-out','URGENT','2026-10-16');
    await add('old-overdue','LOW','2026-08-01');await add('undated','URGENT','');
    await add('completed','URGENT','2026-10-08','COMPLETED');await add('cancelled','URGENT','2026-10-08','CANCELLED');
    const before=(await db.query('SELECT * FROM academic_tasks ORDER BY id')).rows;
    const legacy=(await db.query(`INSERT INTO notification_deliveries(user_id,task_id,type,status,scheduled_at,read_at) VALUES($1,$2,'TASK_DUE_24H','SENT',$3,now()) RETURNING id`,[user.id,ids.low,'2026-10-09T23:59:59-03:00'])).rows[0];
    const expired=(await db.query(`INSERT INTO notification_deliveries(user_id,task_id,type,status,scheduled_at) VALUES($1,$2,'TASK_DEADLINE','SENT',$3) RETURNING id`,[user.id,ids['old-overdue'],'2026-08-01T23:59:59-03:00'])).rows[0];
    const first=await readNotifications(db,user,{now});
    assert.equal(first.today,'2026-10-08');assert.equal(first.items.length,4);assert.equal(first.unread,3);assert.ok(first.items.find(i=>i.title==='low').read_at);
    assert.deepEqual(first.items.map(i=>i.title),['low','high','normal','urgent']);
    assert.equal((await db.query('SELECT status FROM notification_deliveries WHERE id=$1',[expired.id])).rows[0].status,'CANCELLED');
    assert.equal(first.items.find(i=>i.title==='low').message,'Entrega amanhã');
    assert.equal(first.items.find(i=>i.title==='urgent').priorityLabel,'Urgente');
    assert.equal((await db.query('SELECT status FROM notification_deliveries WHERE id=$1',[legacy.id])).rows[0].status,'CANCELLED');
    assert.deepEqual((await readNotifications(db,other,{now})).items,[]);
    assert.deepEqual((await db.query('SELECT * FROM academic_tasks ORDER BY id')).rows,before);
    assert.equal((await db.query('SELECT revision FROM users WHERE id=$1',[user.id])).rows[0].revision,0);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM task_history')).rows[0].n,0);
    const low=first.items.find(i=>i.title==='low');
    await db.query('UPDATE notification_deliveries SET read_at=now() WHERE id=$1',[low.id]);
    const again=await readNotifications(db,user,{now});assert.equal(again.items.length,4);assert.equal(again.unread,3);assert.ok(again.items.find(i=>i.id===low.id).read_at);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM notification_deliveries WHERE type='TASK_DEADLINE'")).rows[0].n,5);
    await db.query("UPDATE academic_tasks SET priority='LOW' WHERE id=$1",[ids.urgent]);
    assert.equal((await readNotifications(db,user,{now})).items.some(i=>i.title==='urgent'),false);
    await db.query("UPDATE academic_tasks SET priority='URGENT' WHERE id=$1",[ids.urgent]);
    assert.equal((await readNotifications(db,user,{now})).items.length,4);
    await db.query('UPDATE academic_tasks SET due_date=$1 WHERE id=$2',['2026-10-08T23:59:59-03:00',ids.low]);
    const shifted=(await readNotifications(db,user,{now})).items.find(i=>i.title==='low');assert.notEqual(shifted.id,low.id);assert.equal(shifted.read_at,null);assert.equal(shifted.message,'Entrega hoje');
    await db.query("UPDATE academic_tasks SET status='COMPLETED' WHERE id=$1",[ids.low]);
    assert.equal((await readNotifications(db,user,{now})).items.some(i=>i.task_id===ids.low),false);
    await db.query("UPDATE academic_tasks SET status='TODO' WHERE id=$1",[ids.low]);
    assert.equal((await readNotifications(db,user,{now})).items.find(i=>i.task_id===ids.low).id,shifted.id);
    await db.query('UPDATE users SET notifications_enabled=false WHERE id=$1',[user.id]);
    assert.deepEqual((await readNotifications(db,user,{now})).items,[]);
    await db.query('UPDATE users SET notifications_enabled=true WHERE id=$1',[user.id]);
    assert.equal((await readNotifications(db,user,{now})).items.length,4);
    const tomorrow=await readNotifications(db,user,{now:new Date('2026-10-09T03:00:00Z')});
    assert.equal(tomorrow.items.some(i=>i.task_id===ids.low),false);
    assert.ok(tomorrow.items.every(i=>i.message && i.due >= tomorrow.today));
    assert.equal((await db.query('SELECT status FROM notification_deliveries WHERE id=$1',[shifted.id])).rows[0].status,'CANCELLED');
    const concurrent=await Promise.all([readNotifications(db,user,{now}),readNotifications(db,user,{now})]);
    assert.deepEqual(concurrent[0],concurrent[1]);
    await db.query('DELETE FROM academic_tasks WHERE id=$1',[ids.high]);
    assert.equal((await readNotifications(db,user,{now})).items.some(i=>i.task_id===ids.high),false);
  }finally{await db.close();}
});
