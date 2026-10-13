import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/database.mjs';

test('database cardinalities, subject ownership, Classroom uniqueness and deletion rules',async()=>{
  const db=await openDatabase({url:'',directory:'memory://'});
  const count=async(table)=>Number((await db.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  try{
    const user=async(email)=>(await db.query('INSERT INTO users(name,email,password_hash,updated_at) VALUES($1,$2,$3,now()) RETURNING id',['Test',email,'test-only'])).rows[0].id;
    const a=await user('cardinality-a@example.test'),b=await user('cardinality-b@example.test');
    const subject=async(owner,name)=>(await db.query('INSERT INTO subjects(user_id,name,updated_at) VALUES($1,$2,now()) RETURNING id',[owner,name])).rows[0].id;
    const s=await subject(a,'Subject A'),other=await subject(b,'Subject B');
    const task=async(owner,subjectId)=>(await db.query('INSERT INTO academic_tasks(user_id,subject_id,title,updated_at) VALUES($1,$2,$3,now()) RETURNING id',[owner,subjectId,'Task'])).rows[0].id;
    const t1=await task(a,s),t2=await task(a,s);
    assert.equal(await count('academic_tasks'),2);
    await assert.rejects(task(a,other),/tasks_owned_subject/);
    await assert.rejects(db.query('INSERT INTO study_sessions(user_id,subject_id,started_at,duration_seconds) VALUES($1,$2,now(),60)',[a,other]),/sessions_owned_subject/);
    await db.query('INSERT INTO study_sessions(user_id,subject_id,task_id,started_at,duration_seconds) VALUES($1,$2,$3,now(),60)',[a,s,t1]);
    await db.query('INSERT INTO study_sessions(user_id,subject_id,started_at,duration_seconds) VALUES($1,$2,now(),120)',[a,s]);
    assert.equal(await count('study_sessions'),2);
    await db.query('INSERT INTO task_history(task_id,user_id) VALUES($1,$2)',[t1,a]);
    await db.query('INSERT INTO classroom_connections(user_id,tokens_encrypted) VALUES($1,$2)',[a,'test-only']);
    await assert.rejects(db.query('INSERT INTO classroom_connections(user_id,tokens_encrypted) VALUES($1,$2)',[a,'test-only']),/duplicate key/);
    await db.query('INSERT INTO classroom_task_links(user_id,course_id,coursework_id,task_id,last_imported) VALUES($1,$2,$3,$4,$5)',[a,'course','work',t1,'{}']);
    await assert.rejects(db.query('INSERT INTO classroom_task_links(user_id,course_id,coursework_id,task_id,last_imported) VALUES($1,$2,$3,$4,$5)',[a,'course','another-work',t1,'{}']),/duplicate key/);
    await db.query('DELETE FROM academic_tasks WHERE id=$1',[t1]);
    assert.equal(await count('study_sessions'),2);
    assert.equal((await db.query('SELECT task_id FROM study_sessions WHERE subject_id=$1',[s])).rows.every(row=>row.task_id===null),true);
    assert.equal(await count('task_history'),0);
    assert.equal((await db.query('SELECT task_id FROM classroom_task_links WHERE user_id=$1',[a])).rows[0].task_id,null);
    await db.query('DELETE FROM subjects WHERE id=$1',[s]);
    assert.equal(await count('academic_tasks'),0);assert.equal(await count('study_sessions'),0);
    assert.ok(t2);
    await db.query('DELETE FROM users WHERE id=$1',[a]);
    assert.equal(await count('classroom_connections'),0);assert.equal(await count('classroom_task_links'),0);
    assert.equal(await count('users'),1);assert.equal(await count('subjects'),1);
  }finally{await db.close();}
});
