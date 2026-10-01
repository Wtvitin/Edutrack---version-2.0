import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function prepareAnalytics(data,days,subject){
  return new Promise((resolve,reject)=>{
    // Account IDs/email/profile and descriptions are deliberately omitted.
    const safe={subjects:data.subjects.map(s=>({id:s.id,name:s.name})),sessions:data.sessions.map(s=>({subjectId:s.subjectId,date:s.date,minutes:s.minutes})),tasks:data.tasks.map(t=>({subjectId:t.subjectId,due:t.due,done:t.done,status:t.status,priority:t.priority,estimatedMinutes:t.estimatedMinutes,completedAt:t.completedAt?new Date(t.completedAt).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}):null}))};
    const child=spawn(process.env.PYTHON_BIN||'python',['-X','utf8',fileURLToPath(new URL('../analytics/prepare.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',size=0;const timer=setTimeout(()=>{child.kill();reject(new Error('Analytics timeout'));},15000);
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>2e6){child.kill();return;}output+=chunk;});child.stderr.resume();
    child.on('error',e=>{clearTimeout(timer);reject(e);});child.stdin.on('error',()=>{});
    child.on('close',code=>{clearTimeout(timer);try{if(code!==0||size>2e6)throw new Error('Analytics unavailable');resolve(JSON.parse(output));}catch(e){reject(e);}});
    child.stdin.end(JSON.stringify({data:safe,days,subject,today:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})}));
  });
}
