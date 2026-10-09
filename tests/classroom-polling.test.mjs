import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomPoller,CLASSROOM_POLL_MS,submissionLabels} from '../lib/classroom-polling.mjs';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(request){
  let time=1000000,visible=true,wake,changed,calls=0,unsubscribed=false;
  const timers=new Map(),results=[],errors=[];let sequence=0;
  const stop=createClassroomPoller({
    request:async signal=>{calls++;return request?request(signal,time):{nextCheckAt:new Date(time+CLASSROOM_POLL_MS).toISOString()};},
    onResult:result=>results.push(result),onError:error=>errors.push(error),now:()=>time,isVisible:()=>visible,
    setTimer(fn,delay){const id=++sequence;timers.set(id,{fn,at:time+delay});return id;},clearTimer:id=>timers.delete(id),
    subscribe(first,second){wake=first;changed=second;return ()=>{unsubscribed=true;};},
  });
  return {stop,results,errors,timers,get calls(){return calls;},get unsubscribed(){return unsubscribed;},
    wake:()=>wake(),changed:()=>changed(),hide(){visible=false;wake();},show(){visible=true;wake();},
    async advance(ms){time+=ms;for(const [id,timer] of [...timers])if(timer.at<=time){timers.delete(id);timer.fn();}await settle();},
  };
}
test('Polling starts immediately, respects interval, pauses hidden tabs, resumes, and cleans up',async()=>{
  const f=fixture();await settle();assert.equal(f.calls,1);f.wake();await settle();assert.equal(f.calls,1);
  await f.advance(CLASSROOM_POLL_MS);assert.equal(f.calls,2);
  f.hide();await f.advance(CLASSROOM_POLL_MS*5);assert.equal(f.calls,2);assert.equal(f.timers.size,0);
  f.show();await settle();assert.equal(f.calls,3);
  f.changed();await settle();assert.equal(f.calls,4);f.stop();assert.ok(f.unsubscribed);assert.equal(f.timers.size,0);
  await f.advance(CLASSROOM_POLL_MS*10);assert.equal(f.calls,4);
});
test('Transport failures back off; stopping aborts and ignores a late response',async()=>{
  const f=fixture(async()=>{throw new Error('offline');});await settle();assert.equal(f.errors.length,1);
  await f.advance(CLASSROOM_POLL_MS);assert.equal(f.calls,2);
  await f.advance(CLASSROOM_POLL_MS);assert.equal(f.calls,2);
  await f.advance(CLASSROOM_POLL_MS);assert.equal(f.calls,3);f.stop();
  let signal,resolve;const pending=fixture(incoming=>{signal=incoming;return new Promise(done=>{resolve=done;});});
  pending.stop();assert.ok(signal.aborted);resolve({nextCheckAt:''});await settle();assert.equal(pending.results.length,0);assert.equal(pending.timers.size,0);
});
test('An import/disconnect during a request queues a fresh read, without overlap',async()=>{
  let resolve;const f=fixture(()=>new Promise(done=>{resolve=done;}));f.changed();assert.equal(f.calls,1);
  resolve({nextCheckAt:''});await settle();await f.advance(0);assert.equal(f.calls,2);
  f.stop();resolve({nextCheckAt:''});await settle();assert.equal(f.results.length,1);
});
test('Delivery and local completion are distinct; returned and reclaimed are explicit',()=>{
  assert.equal(submissionLabels.TURNED_IN,'Entregue no Classroom');
  assert.equal(submissionLabels.RETURNED,'Devolvida pelo professor');
  assert.equal(submissionLabels.RECLAIMED_BY_STUDENT,'Entrega retirada no Classroom');
  assert.match(submissionLabels.UNKNOWN,/não disponível/);
});
