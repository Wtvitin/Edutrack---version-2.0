import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/database.mjs';
import {createDeliveryReader,DELIVERY_INTERVAL_MS} from '../server/classroom-deliveries.mjs';

test('Delivery observations: account isolation, cache, dedupe, failures, rollback, and local completion independence',async()=>{
  const db=await openDatabase({directory:'memory://',url:''});
  let time=Date.parse('2026-10-08T12:00:00Z'),calls=0,remoteState='TURNED_IN',remoteError=false,malformed=false,missing=false;
  let deferred=null;
  async function account(email){return (await db.query("INSERT INTO users(name,email,password_hash,updated_at) VALUES('Teste',$1,'test-only',now()) RETURNING *",[email])).rows[0];}
  const owner=await account('delivery-owner@example.test'),other=await account('delivery-other@example.test');
  const subject=(await db.query("INSERT INTO subjects(user_id,name,updated_at) VALUES($1,'Matemática',now()) RETURNING id",[owner.id])).rows[0];
  const task=(await db.query("INSERT INTO academic_tasks(user_id,subject_id,title,description,status,priority,updated_at) VALUES($1,$2,'Trabalho','Minha anotação','COMPLETED','URGENT',now()) RETURNING *",[owner.id,subject.id])).rows[0];
  await db.query("INSERT INTO classroom_connections(user_id,tokens_encrypted,selected_course_ids) VALUES($1,'not-a-real-token','[\"course1\"]')",[owner.id]);
  await db.query("INSERT INTO classroom_task_links(user_id,course_id,coursework_id,task_id,last_imported) VALUES($1,'course1','work1',$2,'{}')",[owner.id,task.id]);
  const initialTask=(await db.query('SELECT * FROM academic_tasks WHERE id=$1',[task.id])).rows[0];
  const reader=createDeliveryReader(db,{
    enabled:true,now:()=>time,
    async access(user){assert.equal(user.id,owner.id);return {row:(await db.query('SELECT * FROM classroom_connections WHERE user_id=$1',[user.id])).rows[0],accessToken:'test-only'};},
    async pages(token,path,parameters,key){
      calls++;assert.equal(token,'test-only');assert.equal(path,'courses/course1/courseWork/-/studentSubmissions');
      assert.equal(parameters.userId,'me');assert.equal(key,'studentSubmissions');assert.ok(!parameters.fields.includes('grade'));
      if(deferred)await deferred;
      if(remoteError)throw Object.assign(new Error('Limite do Classroom atingido. Aguarde e tente novamente.'),{status:429});
      return missing?[]:[{id:'submission1',courseId:malformed?'someone-else':'course1',courseWorkId:'work1',state:remoteState,late:false}];
    },
  });
  try{
    const result=await reader(owner);assert.equal(calls,1);assert.equal(result.items[0].state,'TURNED_IN');assert.equal(result.items[0].taskId,task.id);assert.equal(result.error,null);
    assert.ok(!JSON.stringify(result).includes('test-only'));assert.equal(result.checkedAt,new Date(time).toISOString());
    await reader(owner);assert.equal(calls,1,'cache protects quota across repeated navigation');
    assert.deepEqual((await reader(other)).items,[]);assert.equal(calls,1);assert.equal((await reader(other)).connected,false);
    assert.deepEqual((await db.query('SELECT * FROM academic_tasks WHERE id=$1',[task.id])).rows[0],initialTask);
    assert.equal((await db.query('SELECT revision FROM users WHERE id=$1',[owner.id])).rows[0].revision,0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM task_history')).rows[0].count,0);
    // Concurrent tabs share a single upstream request.
    time+=DELIVERY_INTERVAL_MS;let release;deferred=new Promise(resolve=>{release=resolve;});
    const one=reader(owner),two=reader(owner);release();assert.deepEqual(await one,await two);deferred=null;assert.equal(calls,2);
    // Known status stays visible on outages, with exponential server backoff.
    time+=DELIVERY_INTERVAL_MS;remoteError=true;
    const failed=await reader(owner);assert.match(failed.error,/Limite/);assert.equal(failed.items[0].state,'TURNED_IN');assert.notEqual(failed.checkedAt,new Date(time).toISOString());
    await reader(owner);assert.equal(calls,3);
    time+=DELIVERY_INTERVAL_MS;const secondFailure=await reader(owner);assert.equal(calls,4);assert.equal(Date.parse(secondFailure.nextCheckAt)-time,240000);
    time+=240000;remoteError=false;remoteState='RECLAIMED_BY_STUDENT';
    assert.equal((await reader(owner)).items[0].state,'RECLAIMED_BY_STUDENT');
    assert.equal((await db.query('SELECT status FROM academic_tasks WHERE id=$1',[task.id])).rows[0].status,'COMPLETED');
    // Absent submissions aren't mistaken for pending or delivered.
    time+=DELIVERY_INTERVAL_MS;missing=true;assert.equal((await reader(owner)).items[0].state,'UNKNOWN');missing=false;
    // A malformed response is never partially committed.
    time+=DELIVERY_INTERVAL_MS;malformed=true;const before=(await db.query('SELECT * FROM classroom_task_links')).rows;
    assert.match((await reader(owner)).error,/inválida/);assert.deepEqual((await db.query('SELECT * FROM classroom_task_links')).rows,before);malformed=false;
    // Reconnection changes identity and bypasses stale backoff safely.
    await db.query('UPDATE classroom_connections SET id=gen_random_uuid(),last_delivery_check_at=NULL WHERE user_id=$1',[owner.id]);
    remoteState='RETURNED';assert.equal((await reader(owner)).items[0].state,'RETURNED');
    // Disconnect while Google is responding cannot restore a removed connection.
    time+=DELIVERY_INTERVAL_MS;deferred=new Promise(resolve=>{release=resolve;});const flight=reader(owner);
    while(calls<9)await new Promise(resolve=>setImmediate(resolve));
    await db.query('DELETE FROM classroom_connections WHERE user_id=$1',[owner.id]);release();
    assert.equal((await flight).connected,false);assert.deepEqual((await reader(owner)).items,[]);
  }finally{await db.close();}
});

test('Disabled integration does not request Google',async()=>{
  const db=await openDatabase({directory:'memory://',url:''});
  try{
    const reader=createDeliveryReader(db,{enabled:false,access(){assert.fail('No access');},pages(){assert.fail('No Google');}});
    const response=await reader({id:'00000000-0000-0000-0000-000000000000'});assert.equal(response.configured,false);assert.deepEqual(response.items,[]);
  }finally{await db.close();}
});
