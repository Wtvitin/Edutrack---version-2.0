import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {openDatabase} from '../server/database.mjs';
import {createAPI} from '../server/api.mjs';
import {classroomDue,createClassroomCipher,validateClassroomScopes,CLASSROOM_SCOPES,CLASSROOM_CALLBACK} from '../server/classroom.mjs';

test('Classroom scope validation handles whitespace and fails closed with secret-free diagnostics',()=>{
  assert.doesNotThrow(()=>validateClassroomScopes('  '+CLASSROOM_SCOPES.join('\t\n')+'  '));
  for(const [value,code] of [[undefined,'classroom-scope-response'],['','classroom-scope-response'],[CLASSROOM_SCOPES[0],'classroom-scope-coursework'],[CLASSROOM_SCOPES[1],'classroom-scope-courses'],['private-token-value','classroom-scope-both']]){
    assert.throws(()=>validateClassroomScopes(value),error=>{
      assert.equal(error.code,code);
      assert.ok(!JSON.stringify(error.classroomDiagnostic).includes('private-token-value'));
      return true;
    });
  }
  // A similarly described submissions scope is not silently treated as coursework access.
  assert.throws(()=>validateClassroomScopes(CLASSROOM_SCOPES[0]+' https://www.googleapis.com/auth/classroom.student-submissions.me.readonly'),error=>error.code==='classroom-scope-coursework');
});

test('Classroom encrypts and authenticates secrets; UTC deadlines are deterministic',()=>{
  const cipher=createClassroomCipher(randomBytes(32)),secret={accessToken:'test-access',refreshToken:'test-refresh'};
  const encrypted=cipher.encrypt(secret);assert.ok(!encrypted.includes('test-access'));assert.deepEqual(cipher.decrypt(encrypted),secret);
  const damaged=Buffer.from(encrypted,'base64');damaged[35]^=1;
  assert.throws(()=>cipher.decrypt(damaged.toString('base64')),e=>e.code==='classroom-reconnect');
  assert.equal(classroomDue({dueDate:{year:2026,month:10,day:7},dueTime:{hours:1}}),'2026-10-07T01:00:00.000Z');
  assert.equal(classroomDue({}),null);
  assert.throws(()=>classroomDue({dueDate:{year:2026,month:2,day:30}}));
  assert.throws(()=>classroomDue({dueDate:{year:2026,month:10,day:7},dueTime:{hours:25}}));
});

test('Classroom OAuth, isolation, pagination, import, merge, deletion and revocation',async()=>{
  const db=await openDatabase({directory:'memory://',url:''});let api;
  const server=createServer((req,res)=>api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`,key=randomBytes(32);
  let remoteTitle='Trabalho original',remoteDate=7,remoteFailure=false,failRevoke=false,tokenCalls=0,refreshCalls=0;
  let returnedScopes=CLASSROOM_SCOPES.join(' '),noCourses=false,denyCoursework=false,emptyProbe=false;
  const requests=[];
  const google=async(url,options={})=>{
    requests.push({url,method:options.method||'GET'});
    const parsed=new URL(url);
    if(parsed.pathname==='/token'){
      tokenCalls++;const body=new URLSearchParams(options.body);
      assert.equal(body.get('client_secret'),'fake-secret');
      if(body.get('grant_type')==='refresh_token'){refreshCalls++;assert.equal(body.get('refresh_token'),'fake-refresh');}
      else {assert.equal(body.get('redirect_uri'),origin+CLASSROOM_CALLBACK);assert.ok(body.get('code_verifier'));}
      return Response.json({access_token:'fake-access',refresh_token:'fake-refresh',expires_in:3600,scope:returnedScopes});
    }
    if(parsed.pathname==='/revoke')return new Response('',{status:failRevoke?503:200});
    assert.equal(options.headers.Authorization,'Bearer fake-access');
    if(parsed.pathname==='/v1/courses/course1/courseWork/-/studentSubmissions'){
      assert.equal(parsed.searchParams.get('userId'),'me');
      assert.equal(parsed.searchParams.get('fields'),'studentSubmissions(id,courseId,courseWorkId,state,late),nextPageToken');
      if(!parsed.searchParams.has('pageToken'))return Response.json({studentSubmissions:[{id:'submission1',courseId:'course1',courseWorkId:'work1',state:'TURNED_IN',late:false}],nextPageToken:'deliveries2'});
      assert.equal(parsed.searchParams.get('pageToken'),'deliveries2');
      return Response.json({studentSubmissions:[{id:'submission2',courseId:'course1',courseWorkId:'work2',state:'CREATED',late:true}]});
    }
    if(parsed.pathname==='/v1/courses'){
      assert.equal(parsed.searchParams.get('studentId'),'me');assert.equal(parsed.searchParams.get('courseStates'),'ACTIVE');
      return Response.json({courses:noCourses?[]:[{id:'course1',name:'Matemática',courseState:'ACTIVE',section:'Turma A'}]});
    }
    if(remoteFailure)return Response.json({error:{message:'sensitive provider details'}},{status:503});
    assert.equal(parsed.pathname,'/v1/courses/course1/courseWork');
    assert.equal(parsed.searchParams.get('courseWorkStates'),'PUBLISHED');
    if(denyCoursework)return Response.json({error:{message:'not permitted'}},{status:403});
    if(parsed.searchParams.get('pageSize')==='1'){
      assert.equal(parsed.searchParams.get('fields'),'courseWork(id)');
      return Response.json(emptyProbe?{}:{courseWork:[{id:'work1'}]});
    }
    if(!parsed.searchParams.has('pageToken'))return Response.json({courseWork:[{id:'work1',courseId:'course1',state:'PUBLISHED',title:remoteTitle,description:'Enunciado',alternateLink:'https://classroom.google.com/c/course1/a/work1',dueDate:{year:2026,month:10,day:remoteDate},dueTime:{hours:1}}],nextPageToken:'page2'});
    assert.equal(parsed.searchParams.get('pageToken'),'page2');
    return Response.json({courseWork:[{id:'work2',courseId:'course1',state:'PUBLISHED',title:'Atividade sem prazo'}]});
  };
  api=createAPI(db,{origin,local:true,mailMode:'local',env:{},classroomConfig:{enabled:true,key,clientId:'fake-client',clientSecret:'fake-secret',redirectUri:origin+CLASSROOM_CALLBACK},classroomTransport:{fetchImpl:google}});
  let cookie='';
  const call=async(path,input,method=input?'POST':'GET',headers={})=>{
    const response=await fetch(origin+path,{method,redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...headers},body:input?JSON.stringify(input):undefined});
    const text=await response.text();
    return {status:response.status,body:text?JSON.parse(text):null,location:response.headers.get('location'),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  async function account(email){
    cookie='';await call('/api/auth/register',{name:'Teste',email,password:'test-password-123'});
    const token=new URL((await call('/api/dev/mail')).body.messages[0].link).searchParams.get('token');await call('/api/auth/verify',{token});
    cookie=(await call('/api/auth/login',{email,password:'test-password-123'})).cookie;return cookie;
  }
  async function authorize(){const response=await call('/api/integrations/classroom/connect',{});assert.equal(response.status,200);const url=new URL(response.body.authorizationUrl);assert.equal(url.hostname,'accounts.google.com');assert.equal(url.searchParams.get('scope'),CLASSROOM_SCOPES.join(' '));assert.equal(url.searchParams.get('code_challenge_method'),'S256');return url.searchParams.get('state');}
  const status=()=>call('/api/integrations/classroom/status');
  const snapshot=()=>call('/api/data');
  async function sync(courseIds=['course1'],revision){revision??=(await snapshot()).body.revision;return call('/api/integrations/classroom/sync',{courseIds,revision});}
  try{
    assert.equal((await status()).status,401);
    assert.equal((await call('/api/integrations/classroom/deliveries',{})).status,401);
    const ownerCookie=await account('classroom-owner@example.test');
    const owner=(await db.query("SELECT * FROM users WHERE email='classroom-owner@example.test'")).rows[0];
    assert.equal((await status()).body.connected,false);
    assert.equal((await call('/api/integrations/classroom/connect',{},'POST',{Origin:'https://evil.test'})).status,403);
    assert.equal((await call('/api/integrations/classroom/deliveries',{},'POST',{Origin:'https://evil.test'})).status,403);
    const state=await authorize();
    const stateRow=(await db.query('SELECT * FROM classroom_oauth_states')).rows[0];assert.notEqual(stateRow.state_hash,state);assert.ok(!stateRow.verifier_encrypted.includes('fake'));
    // A different account and a different session of the owner cannot consume state.
    const otherCookie=await account('classroom-other@example.test');
    assert.ok((await call(CLASSROOM_CALLBACK+'?state='+state+'&code=test')).location.includes('classroom-state'));
    assert.equal(tokenCalls,0);
    cookie=(await call('/api/auth/login',{email:'classroom-owner@example.test',password:'test-password-123'})).cookie;
    assert.ok((await call(CLASSROOM_CALLBACK+'?state='+state+'&code=test')).location.includes('classroom-state'));assert.equal(tokenCalls,0);
    cookie=ownerCookie;
    const callback=await call(CLASSROOM_CALLBACK+'?state='+state+'&code=test',undefined,'GET',{'sec-fetch-site':'cross-site'});
    assert.equal(callback.status,303);assert.equal(callback.location,'/integracoes?classroom=connected');assert.equal(tokenCalls,1);
    assert.ok((await call(CLASSROOM_CALLBACK+'?state='+state+'&code=test')).location.includes('classroom-state'));assert.equal(tokenCalls,1);
    const publicStatus=await status();assert.equal(publicStatus.body.connected,true);assert.ok(!JSON.stringify(publicStatus.body).includes('fake-'));
    const connected=(await db.query('SELECT * FROM classroom_connections WHERE user_id=$1',[owner.id])).rows[0];assert.ok(!connected.tokens_encrypted.includes('fake-refresh'));
    assert.equal((await call('/api/integrations/classroom/courses')).body.courses.length,1);
    assert.equal((await sync(['forbidden'])).status,403);assert.equal((await sync(['course1','course1'])).status,400);
    const before=(await snapshot()).body;
    const imported=await sync();assert.equal(imported.status,200);assert.equal(imported.body.created,2);assert.equal(imported.body.subjectsCreated,1);
    assert.equal((await call('/api/data',before,'PUT')).status,409);
    const data=(await snapshot()).body;assert.equal(data.data.tasks.length,2);assert.equal(data.data.subjects.length,2);
    const delivery=await call('/api/integrations/classroom/deliveries',{});
    assert.equal(delivery.status,200);assert.equal(delivery.body.items.length,2);
    assert.ok(delivery.body.items.some(item=>item.state==='TURNED_IN'));
    assert.ok(delivery.body.items.some(item=>item.state==='CREATED'&&item.late));
    assert.deepEqual((await snapshot()).body,data,'remote deliveries must not mark local tasks complete');
    assert.equal((await call('/api/integrations/classroom/deliveries',{force:true})).status,400);
    const first=data.data.tasks.find(t=>t.title==='Trabalho original');assert.equal(first.due,'2026-10-06');assert.ok(first.description.includes('classroom.google.com'));
    const firstDb=(await db.query('SELECT * FROM academic_tasks WHERE id=$1',[first.id])).rows[0];assert.equal(new Date(firstDb.due_date).toISOString(),'2026-10-07T01:00:00.000Z');assert.equal(firstDb.created_by,'SYSTEM');
    assert.equal((await call('/api/history')).body.items.length,2);
    // An unrelated save keeps the precise UTC deadline, while local edits survive sync.
    first.done=true;first.status='COMPLETED';first.priority='urgente';first.description+='\nMinha anotação';first.estimatedMinutes=45;
    assert.equal((await call('/api/data',data,'PUT')).status,200);
    assert.equal(new Date((await db.query('SELECT due_date FROM academic_tasks WHERE id=$1',[first.id])).rows[0].due_date).toISOString(),'2026-10-07T01:00:00.000Z');
    remoteTitle='Título atualizado';remoteDate=8;
    const updated=await sync();assert.equal(updated.status,200);assert.equal(updated.body.created,0);assert.equal(updated.body.updated,1);
    const edited=(await snapshot()).body;const task=edited.data.tasks.find(t=>t.id===first.id);
    assert.equal(task.title,remoteTitle);assert.equal(task.due,'2026-10-07');assert.equal(task.priority,'urgente');assert.equal(task.done,true);assert.equal(task.estimatedMinutes,45);assert.ok(task.description.includes('Minha anotação'));
    task.title='Meu título';assert.equal((await call('/api/data',edited,'PUT')).status,200);remoteTitle='Outro título do Google';
    assert.equal((await sync()).body.updated,0);assert.equal((await snapshot()).body.data.tasks.find(t=>t.id===first.id).title,'Meu título');
    const same=await sync();assert.equal(same.body.created,0);assert.equal(same.body.unchanged,2);
    // Stale revisions and provider failure cannot partially import.
    assert.equal((await sync(['course1'],0)).status,409);
    const beforeFailure=(await snapshot()).body;remoteFailure=true;
    const failed=await sync();assert.equal(failed.status,502);assert.ok(!JSON.stringify(failed.body).includes('sensitive'));
    assert.deepEqual((await snapshot()).body,beforeFailure);remoteFailure=false;
    // Deleted local tasks are not resurrected by the next import.
    const removal=(await snapshot()).body;removal.data.tasks=removal.data.tasks.filter(t=>t.id!==first.id);await call('/api/data',removal,'PUT');
    const afterDelete=await sync();assert.equal(afterDelete.body.skippedDeleted,1);assert.equal((await snapshot()).body.data.tasks.length,1);
    // Force expiry to cover token renewal without returning tokens to the browser.
    const encrypted=createClassroomCipher(key).encrypt({accessToken:'expired',refreshToken:'fake-refresh',expiresAt:0});
    await db.query('UPDATE classroom_connections SET tokens_encrypted=$2 WHERE user_id=$1',[owner.id,encrypted]);
    assert.equal((await call('/api/integrations/classroom/courses')).status,200);assert.equal(refreshCalls,1);
    cookie=otherCookie;assert.equal((await status()).body.connected,false);assert.equal((await call('/api/integrations/classroom/courses')).status,409);assert.equal((await snapshot()).body.data.tasks.length,0);
    assert.deepEqual((await call('/api/integrations/classroom/deliveries',{})).body.items,[]);
    cookie=ownerCookie;failRevoke=true;assert.equal((await call('/api/integrations/classroom/disconnect',{})).status,503);assert.equal((await status()).body.connected,true);
    failRevoke=false;assert.equal((await call('/api/integrations/classroom/disconnect',{})).status,200);assert.equal((await status()).body.connected,false);assert.equal((await snapshot()).body.data.tasks.length,1);
    // Reconnect uses retained origin mappings, not duplicate imports.
    // The alternate permission requires a successful read, never a blind alias.
    returnedScopes=CLASSROOM_SCOPES[0]+' https://www.googleapis.com/auth/classroom.student-submissions.me.readonly';
    const dataBeforeProbe=(await snapshot()).body;
    denyCoursework=true;
    let probeState=await authorize();
    assert.equal((await call(CLASSROOM_CALLBACK+'?state='+probeState+'&code=test')).location,'/integracoes?classroom=classroom-scope-api-denied');
    assert.equal((await status()).body.connected,false);
    denyCoursework=false;noCourses=true;probeState=await authorize();
    assert.equal((await call(CLASSROOM_CALLBACK+'?state='+probeState+'&code=test')).location,'/integracoes?classroom=classroom-scope-no-courses');
    assert.equal((await status()).body.connected,false);
    noCourses=false;remoteFailure=true;probeState=await authorize();
    assert.equal((await call(CLASSROOM_CALLBACK+'?state='+probeState+'&code=test')).location,'/integracoes?classroom=classroom-failed');
    assert.equal((await status()).body.connected,false);
    remoteFailure=false;emptyProbe=true;probeState=await authorize();
    assert.equal((await call(CLASSROOM_CALLBACK+'?state='+probeState+'&code=test')).location,'/integracoes?classroom=connected');
    assert.equal((await status()).body.connected,true);
    assert.deepEqual((await snapshot()).body,dataBeforeProbe);
    assert.equal((await sync()).status,200);
    assert.equal((await call('/api/integrations/classroom/disconnect',{})).status,200);
    returnedScopes=CLASSROOM_SCOPES.join(' ');emptyProbe=false;
    const nextState=await authorize();await call(CLASSROOM_CALLBACK+'?state='+nextState+'&code=test');
    const reimport=await sync();assert.equal(reimport.body.created,0);assert.equal(reimport.body.skippedDeleted,1);
    const denied=await authorize();assert.ok((await call(CLASSROOM_CALLBACK+'?state='+denied+'&error=access_denied')).location.includes('classroom-denied'));
    const expired=await authorize();await db.query('UPDATE classroom_oauth_states SET expires_at=now()-interval \'1 minute\' WHERE user_id=$1',[owner.id]);assert.ok((await call(CLASSROOM_CALLBACK+'?state='+expired+'&code=test')).location.includes('classroom-state'));
    assert.ok(requests.filter(r=>r.url.startsWith('https://classroom.googleapis.com')).every(r=>r.method==='GET'));
  }finally{await new Promise(resolve=>server.close(resolve));await db.close();}
});

test('Classroom disabled has truthful status and controlled errors',async()=>{
  const db=await openDatabase({directory:'memory://',url:''});let api;
  const server=createServer((req,res)=>api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;api=createAPI(db,{origin,local:true,mailMode:'local',env:{},classroomConfig:{enabled:false}});
  try{
    // Authentication remains mandatory even when the integration is disabled.
    const response=await fetch(origin+'/api/integrations/classroom/status');assert.equal(response.status,401);
  }finally{await new Promise(resolve=>server.close(resolve));await db.close();}
});
