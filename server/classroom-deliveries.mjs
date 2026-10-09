export const DELIVERY_INTERVAL_MS=120000;
const states=new Set(['NEW','CREATED','TURNED_IN','RETURNED','RECLAIMED_BY_STUDENT']);
const iso=value=>value?new Date(value).toISOString():null;
const failure=(message,status=502)=>Object.assign(new Error(message),{status});

// One reader per backend. Dedupe across tabs; keep observations separate from
// snapshot saves so a background refresh cannot lose a user's local edits.
export function createDeliveryReader(db,{enabled,access,pages,now=Date.now}){
  const flights=new Map(),backoff=new Map();
  async function current(user){
    return (await db.query('SELECT id,selected_course_ids,last_delivery_check_at FROM classroom_connections WHERE user_id=$1',[user.id])).rows[0];
  }
  async function observations(user,row,options={}){
    const links=(await db.query('SELECT task_id,course_id,submission_state,submission_late,submission_checked_at FROM classroom_task_links WHERE user_id=$1 AND task_id IS NOT NULL',[user.id])).rows;
    const selected=new Set(row?.selected_course_ids||[]);
    return {configured:!!enabled,connected:!!row,checkedAt:iso(row?.last_delivery_check_at),nextCheckAt:new Date(now()+DELIVERY_INTERVAL_MS).toISOString(),error:null,
      items:row?links.filter(link=>selected.has(link.course_id)).map(link=>({taskId:link.task_id,state:link.submission_state,late:link.submission_late,checkedAt:iso(link.submission_checked_at)})):[],...options};
  }
  async function refresh(user){
    const row=await current(user);
    if(!enabled||!row)return observations(user,null);
    const retry=backoff.get(user.id);
    if(retry?.connectionId===row.id&&retry.until>now())return observations(user,row,{error:retry.message,nextCheckAt:new Date(retry.until).toISOString()});
    const last=row.last_delivery_check_at?new Date(row.last_delivery_check_at).getTime():0;
    if(last&&last+DELIVERY_INTERVAL_MS>now())return observations(user,row,{nextCheckAt:new Date(last+DELIVERY_INTERVAL_MS).toISOString()});
    try{
      const selected=row.selected_course_ids||[];
      if(selected.length>20||selected.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id)))throw failure('Seleção de turmas inválida.',409);
      const links=(await db.query('SELECT course_id,coursework_id FROM classroom_task_links WHERE user_id=$1 AND task_id IS NOT NULL',[user.id])).rows;
      const courses=selected.filter(id=>links.some(link=>link.course_id===id));
      const batch=[];
      if(courses.length){
        const auth=await access(user);
        if(auth.row.id!==row.id)throw failure('A conexão mudou. Atualize a página.',409);
        for(const courseId of courses){
          const submissions=await pages(auth.accessToken,'courses/'+encodeURIComponent(courseId)+'/courseWork/-/studentSubmissions',{
            userId:'me',fields:'studentSubmissions(id,courseId,courseWorkId,state,late),nextPageToken',
          },'studentSubmissions');
          const seen=new Set();
          for(const submission of submissions){
            if(!submission||submission.courseId!==courseId||typeof submission.courseWorkId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(submission.courseWorkId)||seen.has(submission.courseWorkId)||typeof submission.state!=='string'||(submission.late!==undefined&&typeof submission.late!=='boolean'))throw failure('Resposta de entregas inválida do Classroom.');
            seen.add(submission.courseWorkId);
          }
          for(const link of links.filter(link=>link.course_id===courseId)){
            const found=submissions.find(s=>s.courseWorkId===link.coursework_id);
            batch.push({courseId,workId:link.coursework_id,state:states.has(found?.state)?found.state:'UNKNOWN',late:found?.late??null});
          }
          if(batch.length>5000)throw failure('Muitas entregas para consultar.',413);
        }
      }
      const checkedAt=new Date(now()).toISOString();
      await db.transaction(async tx=>{
        const linked=(await tx.query('SELECT id,selected_course_ids FROM classroom_connections WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
        if(linked?.id!==row.id||JSON.stringify(linked.selected_course_ids)!==JSON.stringify(selected))throw failure('A conexão ou seleção de turmas mudou. Aguarde a próxima consulta.',409);
        for(const item of batch)await tx.query('UPDATE classroom_task_links SET submission_state=$4,submission_late=$5,submission_checked_at=$6 WHERE user_id=$1 AND course_id=$2 AND coursework_id=$3 AND task_id IS NOT NULL',[user.id,item.courseId,item.workId,item.state,item.late,checkedAt]);
        await tx.query('UPDATE classroom_connections SET last_delivery_check_at=$2 WHERE user_id=$1',[user.id,checkedAt]);
      });
      backoff.delete(user.id);
      return observations(user,{...row,last_delivery_check_at:checkedAt});
    }catch(error){
      const latest=await current(user);
      if(latest?.id!==row.id)return observations(user,latest);
      // Keep last-known data, not a fabricated pending/delivered status.
      const attempts=retry?.connectionId===row.id?retry.attempts+1:1;
      const until=now()+Math.min(900000,DELIVERY_INTERVAL_MS*2**Math.min(attempts-1,3));
      const message=error.status?error.message:'Não foi possível consultar as entregas. A consulta será repetida automaticamente.';
      if(backoff.size>=10000)for(const [id,value] of backoff)if(value.until<now())backoff.delete(id);
      backoff.set(user.id,{connectionId:row.id,attempts,until,message});
      return observations(user,latest,{error:message,nextCheckAt:new Date(until).toISOString()});
    }
  }
  return async user=>{
    if(flights.has(user.id))return flights.get(user.id);
    const flight=refresh(user).finally(()=>flights.delete(user.id));
    flights.set(user.id,flight);return flight;
  };
}
