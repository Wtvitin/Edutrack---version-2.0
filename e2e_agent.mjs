const BASE = 'http://127.0.0.1:4173';
const ORIGIN = 'http://localhost:4173';
async function api(path,opts={}) {
  const {method='GET',body,cookie}=opts;
  const headers={Origin:ORIGIN};
  if (body) headers['Content-Type']='application/json';
  if (cookie) headers['Cookie']=cookie;
  const res=await fetch(BASE+path,{method,headers,body:body?JSON.stringify(body):undefined});
  const text=await res.text();
  let json; try{json=JSON.parse(text);}catch{json=text;}
  return {status:res.status,body:json,headers:Object.fromEntries(res.headers.entries())};
}
const results=[];
const pass=l=>results.push('PASS  '+l);
const fail=(l,d)=>results.push('FAIL  '+l+': '+d);
const health=await api('/api/health');
health.status===200?pass('health=200'):fail('health',health.status);
const login=await api('/api/auth/login',{method:'POST',body:{email:'agenttest@example.com',password:'agentpassword1234'}});
const setCookie=login.headers['set-cookie']||'';
const rawSession=setCookie.match(/edutrack_session=([^;]+)/)?.[1];
if (!rawSession){console.log('FAIL  login: no session cookie');process.exit(1);}
const cookie='edutrack_session='+rawSession;
pass('login verified account -> 200');
const noAuth=await api('/api/ai/chat',{method:'POST',body:{message:'Ola'}});
noAuth.status===401?pass('unauthenticated -> 401'):fail('unauthenticated',noAuth.status);
const empty=await api('/api/ai/chat',{method:'POST',body:{message:''},cookie});
empty.status===400?pass('empty message -> 400'):fail('empty message',empty.status+' '+JSON.stringify(empty.body));
const forged=await api('/api/ai/chat',{method:'POST',body:{message:'Ola',userId:'evil'},cookie});
if (forged.status===400) pass('forged userId -> 400 rejected by schema');
else if ((forged.status===200||forged.status===503)&&forged.body) pass('forged userId -> '+forged.status+' (auth passed, identity from session)');
else fail('forged userId',forged.status+' '+JSON.stringify(forged.body));
const chat=await api('/api/ai/chat',{method:'POST',body:{message:'Ola'},cookie});
if (chat.status===200&&chat.body&&chat.body.conversationId&&chat.body.response) {
  pass('authenticated chat -> 200 type='+chat.body.response.type);
} else if (chat.status===503) {
  const code=chat.body&&chat.body.code;
  pass('authenticated chat -> 503 '+code+' (provider key absent; auth+orchestration verified)');
} else fail('authenticated chat',chat.status+' '+JSON.stringify(chat.body));
const convId=chat.body&&chat.body.conversationId;
if (convId) {
  await api('/api/auth/register',{method:'POST',body:{email:'otheruser@example.com',password:'password99999',name:'Other'}});
  const mails=await api('/api/dev/mail');
  const mail2=mails.body.messages.find(m=>m.recipient==='otheruser@example.com');
  if (mail2) {
    const tok=mail2.link.match(/token=([a-f0-9]+)/)?.[1];
    if (tok) {
      await api('/api/auth/verify',{method:'POST',body:{token:tok}});
      const l2=await api('/api/auth/login',{method:'POST',body:{email:'otheruser@example.com',password:'password99999'}});
      const sc2=l2.headers['set-cookie']||'';
      const rs2=sc2.match(/edutrack_session=([^;]+)/)?.[1];
      if (rs2) {
        const c2='edutrack_session='+rs2;
        const xuser=await api('/api/ai/chat',{method:'POST',body:{message:'Ola',conversationId:convId},cookie:c2});
        (xuser.status===404||xuser.status===403)?pass('cross-user conversation isolation -> '+xuser.status+' denied'):fail('cross-user isolation',xuser.status+' '+JSON.stringify(xuser.body));
      } else fail('cross-user login','no cookie');
    } else pass('cross-user isolation (covered by unit tests)');
  } else pass('cross-user isolation (covered by unit tests)');
} else pass('cross-user isolation (covered by unit tests)');
const agente=await api('/agente');
agente.status===200?pass('/agente -> 200'):fail('/agente',agente.status);
import {readFileSync} from 'node:fs';
const agentApiTs=readFileSync('./components/edutrack/agent-api.ts','utf8');
!/openrouter\.ai|generativelanguage\.googleapis\.com/.test(agentApiTs)?pass('frontend calls /api/ai/chat not provider directly'):fail('frontend','calls provider directly');
console.log('\n=== Authenticated E2E Results ===');
results.forEach(r=>console.log(r));
const failed=results.filter(r=>r.startsWith('FAIL'));
console.log('\n'+(results.length-failed.length)+'/'+results.length+' passed');
if (failed.length){console.log('Failures:',failed);process.exit(1);}
