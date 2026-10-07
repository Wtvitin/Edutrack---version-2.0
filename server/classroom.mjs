import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {z} from 'zod';

export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];
export const CLASSROOM_CALLBACK = '/api/integrations/google/callback';
const STUDENT_SUBMISSIONS_READONLY='https://www.googleapis.com/auth/classroom.student-submissions.me.readonly';
const fail = (message,status=400,code='classroom-error') => Object.assign(new Error(message),{status,code});
const externalId=z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const syncSchema=z.object({courseIds:z.array(externalId).min(1).max(20),revision:z.number().int().nonnegative()}).strict();
const hash=value=>createHash('sha256').update(value).digest('hex');
const iso=value=>value?new Date(value).toISOString():null;

export function validateClassroomScopes(value){
  const scopes=typeof value==='string'?value.trim().split(/\s+/).filter(Boolean):[];
  const missing=CLASSROOM_SCOPES.filter(scope=>!scopes.includes(scope));
  if(!missing.length)return;
  const code=!scopes.length?'classroom-scope-response':missing.length===2?'classroom-scope-both':missing[0]===CLASSROOM_SCOPES[0]?'classroom-scope-courses':'classroom-scope-coursework';
  const failure=fail('O Google não confirmou todas as permissões necessárias.',403,code);
  // Only validated public Classroom scope names are logged, never the token response.
  failure.classroomDiagnostic={scopeFieldPresent:typeof value==='string',missingPermissions:missing.map(scope=>scope===CLASSROOM_SCOPES[0]?'courses.readonly':'coursework.me.readonly'),returnedClassroomPermissions:scopes.filter(scope=>/^https:\/\/www\.googleapis\.com\/auth\/classroom\.[a-z.-]{1,80}$/.test(scope)).slice(0,32).map(scope=>scope.slice('https://www.googleapis.com/auth/'.length)),unrecognizedPermissionCount:scopes.filter(scope=>!CLASSROOM_SCOPES.includes(scope)).length};
  throw failure;
}

export function readClassroomConfig(env={},origin,local=false){
  const path=env.GOOGLE_CLASSROOM_CREDENTIALS_FILE;
  if(!path)return {enabled:false};
  let web;
  try{web=JSON.parse(readFileSync(resolve(path),'utf8')).web;}catch{throw fail('Não foi possível ler o JSON OAuth do Classroom.',500);}
  const redirectUri=origin+CLASSROOM_CALLBACK;
  if(!web?.client_id||!web?.client_secret||!web.redirect_uris?.includes(redirectUri))throw fail('Confira o cliente Web e o endereço de retorno no JSON do Classroom.',500);
  let key;
  if(env.CLASSROOM_TOKEN_ENCRYPTION_KEY){
    key=Buffer.from(env.CLASSROOM_TOKEN_ENCRYPTION_KEY,'base64');
    if(key.length!==32)throw fail('A chave de proteção do Classroom deve ter 32 bytes em base64.',500);
  }else{
    if(!local)throw fail('Configure CLASSROOM_TOKEN_ENCRYPTION_KEY para publicar o Classroom.',500);
    const keyFile=resolve(env.CLASSROOM_TOKEN_KEY_FILE||'.local/classroom-token.key');
    if(!existsSync(keyFile)){
      mkdirSync(dirname(keyFile),{recursive:true});
      try{writeFileSync(keyFile,randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
    }
    key=readFileSync(keyFile);
    if(key.length!==32)throw fail('Arquivo de proteção do Classroom inválido.',500);
  }
  return {enabled:true,clientId:web.client_id,clientSecret:web.client_secret,redirectUri,key};
}

export function createClassroomCipher(key){
  return {
    encrypt(value){
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
      const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
      return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64');
    },
    decrypt(value){
      try{
        const bytes=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
        cipher.setAuthTag(bytes.subarray(12,28));
        return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
      }catch{throw fail('A conexão precisa ser autorizada novamente.',409,'classroom-reconnect');}
    },
  };
}

// Google sends dueDate + dueTime in UTC. Calendar display remains in Brasília.
export function classroomDue(work){
  if(!work.dueDate)return null;
  const {year,month,day}=work.dueDate;
  const {hours=0,minutes=0,seconds=0}=work.dueTime||{};
  if(![year,month,day,hours,minutes,seconds].every(Number.isInteger)||year<2000||year>9999||month<1||month>12||day<1||day>31||hours<0||hours>23||minutes<0||minutes>59||seconds<0||seconds>59)throw fail('O Classroom retornou um prazo inválido.',502);
  const date=new Date(Date.UTC(year,month-1,day,hours,minutes,seconds));
  if(date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw fail('O Classroom retornou um prazo inválido.',502);
  return date.toISOString();
}
function importedFields(work){
  const title=String(work.title||'Atividade do Classroom').trim().slice(0,140)||'Atividade do Classroom';
  const due=classroomDue(work);
  let link='';
  try{const url=new URL(work.alternateLink);if(url.protocol==='https:'&&url.hostname==='classroom.google.com'&&!url.username&&!url.password&&url.href.length<=600)link=url.href;}catch{}
  const source=`\n\nOrigem: Google Classroom${link?'\n'+link:''}`;
  return {title,description:String(work.description||'').slice(0,1500-source.length)+source,due};
}

export function createClassroomService(db,settings,{fetchImpl=fetch}={}){
  const cipher=settings.enabled?createClassroomCipher(settings.key):null;
  const active=new Set();
  function requireConfigured(){if(!settings.enabled)throw fail('Classroom não configurado neste servidor.',503,'classroom-not-configured');}
  async function request(url,options={}){
    let response;
    try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw fail('Não foi possível acessar o Google. Tente novamente.',503,'classroom-unavailable');}
    let result;try{result=await response.json();}catch{
      if(response.ok)throw fail('O Google retornou uma resposta inválida.',502,'classroom-google-error');
      result={};
    }
    if(!response.ok){
      if(result.error==='invalid_grant'||response.status===401)throw fail('A autorização expirou ou foi revogada. Reconecte o Classroom.',409,'classroom-reconnect');
      if(response.status===403)throw fail('Google não permitiu este acesso. Confira as permissões e as regras da instituição.',403,'classroom-permission');
      if(response.status===429)throw fail('Limite do Classroom atingido. Aguarde e tente novamente.',429,'classroom-quota');
      throw fail('O Google não concluiu a solicitação. Confira a configuração e tente novamente.',502,'classroom-google-error');
    }
    return result;
  }
  async function tokenRequest(values){
    return request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:settings.clientId,client_secret:settings.clientSecret,...values}).toString()});
  }
  async function connection(user){
    requireConfigured();
    const row=(await db.query('SELECT * FROM classroom_connections WHERE user_id=$1',[user.id])).rows[0];
    if(!row)throw fail('Conecte o Classroom primeiro.',409,'classroom-reconnect');
    return row;
  }
  async function access(user){
    const row=await connection(user),tokens=cipher.decrypt(row.tokens_encrypted);
    if(tokens.expiresAt>Date.now()+60000)return {row,accessToken:tokens.accessToken};
    const refreshed=await tokenRequest({grant_type:'refresh_token',refresh_token:tokens.refreshToken});
    if(!refreshed.access_token)throw fail('Reconecte o Classroom para renovar o acesso.',409,'classroom-reconnect');
    const next={...tokens,accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token||tokens.refreshToken,expiresAt:Date.now()+(Number(refreshed.expires_in)||3600)*1000};
    const saved=await db.query('UPDATE classroom_connections SET tokens_encrypted=$3,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id',[user.id,row.id,cipher.encrypt(next)]);
    if(!saved.rows.length)throw fail('A conexão mudou. Atualize a página.',409);
    return {row,accessToken:next.accessToken};
  }
  async function pages(accessToken,path,parameters,key){
    const result=[],seen=new Set();let pageToken='';
    for(let page=0;page<50;page++){
      const url=new URL('https://classroom.googleapis.com/v1/'+path);
      url.search=new URLSearchParams({...parameters,pageSize:'100',...(pageToken?{pageToken}:{})}).toString();
      const data=await request(url.href,{headers:{Authorization:'Bearer '+accessToken}});
      if(data[key]!==undefined&&!Array.isArray(data[key]))throw fail('Resposta inválida do Classroom.',502);
      result.push(...(data[key]||[]));
      if(result.length>5000)throw fail('Muitas atividades. Selecione menos turmas.',413);
      if(!data.nextPageToken)return result;
      if(typeof data.nextPageToken!=='string'||seen.has(data.nextPageToken))throw fail('Paginação inválida do Classroom.',502);
      pageToken=data.nextPageToken;seen.add(pageToken);
    }
    throw fail('Muitas páginas de atividades. Selecione menos turmas.',413);
  }
  async function listCourses(accessToken){
    const rows=await pages(accessToken,'courses',{studentId:'me',courseStates:'ACTIVE'},'courses');
    return rows.filter(c=>externalId.safeParse(c.id).success&&c.courseState==='ACTIVE').map(c=>({id:c.id,name:String(c.name||'Turma').slice(0,300),section:String(c.section||'').slice(0,200)}));
  }
  async function verifyGrantedAccess(tokens){
    try{validateClassroomScopes(tokens.scope);return;}
    catch(error){
      const scopes=typeof tokens.scope==='string'?tokens.scope.trim().split(/\s+/):[];
      // Do not assume scope equivalence: verify actual courseWork access first.
      if(error.code!=='classroom-scope-coursework'||!scopes.includes(STUDENT_SUBMISSIONS_READONLY))throw error;
      const courses=await listCourses(tokens.access_token);
      if(!courses.length)throw fail('Nenhuma turma ativa como aluno disponível para confirmar o acesso às atividades.',403,'classroom-scope-no-courses');
      const url=new URL('https://classroom.googleapis.com/v1/courses/'+encodeURIComponent(courses[0].id)+'/courseWork');
      url.search=new URLSearchParams({pageSize:'1',courseWorkStates:'PUBLISHED',fields:'courseWork(id)'}).toString();
      let result;
      try{result=await request(url.href,{headers:{Authorization:'Bearer '+tokens.access_token}});}
      catch(failure){
        if(failure.code==='classroom-permission')throw fail('O Google não autorizou a leitura das atividades pela API.',403,'classroom-scope-api-denied');
        throw failure;
      }
      if(!result||typeof result!=='object'||Array.isArray(result)||(result.courseWork!==undefined&&!Array.isArray(result.courseWork)))throw fail('Resposta inválida na verificação do Classroom.',502);
      console.info('[Classroom OAuth]',JSON.stringify({outcome:'coursework-access-verified',returnedPermission:'classroom.student-submissions.me.readonly'}));
    }
  }
  async function status(user){
    const row=(await db.query('SELECT id,last_sync_at,selected_course_ids FROM classroom_connections WHERE user_id=$1',[user.id])).rows[0];
    return {configured:!!settings.enabled,connected:!!row,lastSyncAt:iso(row?.last_sync_at),selectedCourseIds:row?.selected_course_ids||[]};
  }
  async function connect(user,sessionHash){
    requireConfigured();
    const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
    await db.transaction(async tx=>{
      await tx.query('DELETE FROM classroom_oauth_states WHERE expires_at<now() OR session_hash=$1',[sessionHash]);
      await tx.query("INSERT INTO classroom_oauth_states(state_hash,user_id,session_hash,verifier_encrypted,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",[hash(state),user.id,sessionHash,cipher.encrypt(verifier)]);
    });
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search=new URLSearchParams({client_id:settings.clientId,redirect_uri:settings.redirectUri,response_type:'code',scope:CLASSROOM_SCOPES.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
    return {authorizationUrl:url.href};
  }
  async function callback(user,sessionHash,params){
    requireConfigured();
    const state=params.get('state');
    if(!state||!/^[a-f0-9]{64}$/.test(state)||params.getAll('state').length!==1)throw fail('Autorização inválida. Conecte novamente.',400,'classroom-state');
    const challenge=(await db.query('DELETE FROM classroom_oauth_states WHERE state_hash=$1 AND user_id=$2 AND session_hash=$3 AND expires_at>now() RETURNING verifier_encrypted',[hash(state),user.id,sessionHash])).rows[0];
    if(!challenge)throw fail('Autorização expirada ou já utilizada. Conecte novamente.',400,'classroom-state');
    if(params.has('error'))throw fail('Conexão não autorizada pelo usuário.',400,'classroom-denied');
    const code=params.get('code');
    if(!code||code.length>4096||params.getAll('code').length!==1)throw fail('Autorização inválida.',400,'classroom-state');
    const tokens=await tokenRequest({grant_type:'authorization_code',code,redirect_uri:settings.redirectUri,code_verifier:cipher.decrypt(challenge.verifier_encrypted)});
    if(!tokens.access_token||!tokens.refresh_token)throw fail('Reconecte e confirme as permissões para permitir a sincronização.',409,'classroom-reconnect');
    await verifyGrantedAccess(tokens);
    const encrypted=cipher.encrypt({accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:Date.now()+(Number(tokens.expires_in)||3600)*1000});
    await db.transaction(async tx=>{
      await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
      // A session ended while Google responded must not finish account linking.
      const session=(await tx.query('SELECT token_hash FROM auth_sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now()',[sessionHash,user.id])).rows[0];
      if(!session)throw fail('Entre novamente antes de conectar.',401,'classroom-session');
      await tx.query('INSERT INTO classroom_connections(user_id,tokens_encrypted) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET id=gen_random_uuid(),tokens_encrypted=$2,updated_at=now()',[user.id,encrypted]);
    });
  }
  async function courses(user){const {accessToken}=await access(user);return {courses:await listCourses(accessToken)};}
  async function sync(user,input){
    const parsed=syncSchema.safeParse(input);
    if(!parsed.success||new Set(parsed.data?.courseIds).size!==parsed.data?.courseIds.length)throw fail('Escolha de 1 a 20 turmas e atualize os dados da conta.');
    if(active.has(user.id))throw fail('Uma sincronização já está em andamento.',409);
    active.add(user.id);
    try{
      const {row,accessToken}=await access(user),available=await listCourses(accessToken);
      const courseIds=parsed.data.courseIds;
      if(courseIds.some(id=>!available.some(c=>c.id===id)))throw fail('Turma não autorizada ou não está mais ativa.',403);
      // Fetch all pages first: provider failures cannot cause partial imports.
      const batch=[];let count=0;
      for(const id of courseIds){
        const raw=await pages(accessToken,'courses/'+encodeURIComponent(id)+'/courseWork',{courseWorkStates:'PUBLISHED'},'courseWork');
        const works=raw.filter(w=>w.state==='PUBLISHED').map(w=>{
          if(!externalId.safeParse(w.id).success||w.courseId!==id)throw fail('Atividade inválida do Classroom.',502);
          return {id:w.id,...importedFields(w)};
        });
        if(new Set(works.map(w=>w.id)).size!==works.length)throw fail('Atividades duplicadas na resposta do Classroom.',502);
        count+=works.length;if(count>5000)throw fail('Muitas atividades. Selecione menos turmas.',413);
        batch.push({course:available.find(c=>c.id===id),works});
      }
      return await db.transaction(async tx=>{
        const current=(await tx.query('SELECT revision FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
        if(current.revision!==parsed.data.revision)throw fail('Seus dados mudaram. Atualize a página e sincronize novamente.',409);
        const linked=(await tx.query('SELECT id FROM classroom_connections WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
        if(linked?.id!==row.id)throw fail('A conexão mudou. Atualize a página.',409);
        const total=(await tx.query('SELECT (SELECT count(*) FROM academic_tasks WHERE user_id=$1)::int AS tasks,(SELECT count(*) FROM subjects WHERE user_id=$1)::int AS subjects',[user.id])).rows[0];
        const result={created:0,updated:0,unchanged:0,skippedDeleted:0,subjectsCreated:0};
        for(const {course,works} of batch){
          let mapping=(await tx.query('SELECT subject_id FROM classroom_course_links WHERE user_id=$1 AND course_id=$2',[user.id,course.id])).rows[0];
          if(!mapping?.subject_id){
            if(++total.subjects>500)throw fail('Limite de disciplinas atingido.',413);
            const subject=(await tx.query("INSERT INTO subjects(user_id,name,description,color,updated_at) VALUES($1,$2,$3,'green',now()) RETURNING id",[user.id,course.name.trim().slice(0,60)||'Turma',('Google Classroom'+(course.section?' · '+course.section:'')).slice(0,200)])).rows[0];
            mapping={subject_id:subject.id};result.subjectsCreated++;
            await tx.query('INSERT INTO classroom_course_links(user_id,course_id,subject_id) VALUES($1,$2,$3) ON CONFLICT(user_id,course_id) DO UPDATE SET subject_id=$3',[user.id,course.id,subject.id]);
          }
          for(const work of works){
            const link=(await tx.query('SELECT * FROM classroom_task_links WHERE user_id=$1 AND course_id=$2 AND coursework_id=$3',[user.id,course.id,work.id])).rows[0];
            const baseline={title:work.title,description:work.description,due:work.due};
            if(link&&!link.task_id){result.skippedDeleted++;continue;}
            if(!link){
              if(++total.tasks>5000)throw fail('Limite de tarefas atingido.',413);
              const task=(await tx.query("INSERT INTO academic_tasks(user_id,subject_id,title,description,due_date,created_by,updated_at) VALUES($1,$2,$3,$4,$5,'SYSTEM',now()) RETURNING *",[user.id,mapping.subject_id,work.title,work.description,work.due])).rows[0];
              await tx.query('INSERT INTO classroom_task_links(user_id,course_id,coursework_id,task_id,last_imported) VALUES($1,$2,$3,$4,$5)',[user.id,course.id,work.id,task.id,JSON.stringify(baseline)]);
              await audit(tx,user.id,task,task,{created:true,source:'CLASSROOM'});result.created++;
            }else{
              const old=(await tx.query('SELECT * FROM academic_tasks WHERE id=$1 AND user_id=$2 FOR UPDATE',[link.task_id,user.id])).rows[0];
              if(!old)throw fail('Registro de importação inválido.',409);
              const next={title:old.title===link.last_imported.title?work.title:old.title,description:old.description===link.last_imported.description?work.description:old.description,due:iso(old.due_date)===link.last_imported.due?work.due:iso(old.due_date)};
              const changes={source:'CLASSROOM'};
              for(const [key,before,after] of [['title',old.title,next.title],['description',old.description,next.description],['due',iso(old.due_date),next.due]])if(before!==after)changes[key]={from:before,to:after};
              if(Object.keys(changes).length>1){
                const updated=(await tx.query('UPDATE academic_tasks SET title=$3,description=$4,due_date=$5,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *',[old.id,user.id,next.title,next.description,next.due])).rows[0];
                await audit(tx,user.id,old,updated,changes);result.updated++;
              }else result.unchanged++;
              await tx.query('UPDATE classroom_task_links SET last_imported=$4 WHERE user_id=$1 AND course_id=$2 AND coursework_id=$3',[user.id,course.id,work.id,JSON.stringify(baseline)]);
            }
          }
        }
        await tx.query('UPDATE classroom_connections SET selected_course_ids=$2,last_sync_at=now(),updated_at=now() WHERE user_id=$1',[user.id,JSON.stringify(courseIds)]);
        await tx.query('UPDATE users SET revision=revision+1,updated_at=now() WHERE id=$1',[user.id]);
        return {...result,revision:current.revision+1};
      });
    }finally{active.delete(user.id);}
  }
  async function disconnect(user){
    const row=(await db.query('SELECT * FROM classroom_connections WHERE user_id=$1',[user.id])).rows[0];
    let revoked=false;
    if(row){
      // Revoke first; a temporary outage keeps the connection available to retry.
      requireConfigured();
      const tokens=cipher.decrypt(row.tokens_encrypted);
      let response;
      try{response=await fetchImpl('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:tokens.refreshToken}).toString(),redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw fail('Não foi possível revogar o acesso no Google. Tente novamente.',503);}
      if(!response.ok&&response.status!==400)throw fail('Não foi possível revogar o acesso no Google. Tente novamente.',503);
      revoked=true;
    }
    await db.transaction(async tx=>{
      await tx.query('DELETE FROM classroom_oauth_states WHERE user_id=$1',[user.id]);
      if(row)await tx.query('DELETE FROM classroom_connections WHERE user_id=$1 AND id=$2',[user.id,row.id]);
    });
    return {ok:true,revoked};
  }
  return {status,connect,callback,courses,sync,disconnect};
}
async function audit(tx,userId,old,next,changes){
  await tx.query('INSERT INTO task_history(task_id,user_id,from_status,to_status,from_priority,to_priority,from_due_date,to_due_date,changes_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[next.id,userId,changes.created?null:old.status,next.status,changes.created?null:old.priority,next.priority,changes.created?null:old.due_date,next.due_date,JSON.stringify(changes)]);
}
