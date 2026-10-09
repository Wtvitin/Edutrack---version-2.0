import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudyTimer,resetStudyTimer} from '../lib/study-timer.mjs';

test('timer restores an active session without extra properties',()=>{
  assert.deepEqual(readStudyTimer(JSON.stringify({subject:'math',accumulated:60000,startedAt:123456,extra:true})),{subject:'math',accumulated:60000,startedAt:123456});
});
test('timer restores a paused session',()=>{
  assert.deepEqual(readStudyTimer('{"subject":"math","accumulated":3000,"startedAt":null}'),{subject:'math',accumulated:3000,startedAt:null});
});
test('timer defaults to the current subject for missing or invalid storage',()=>{
  for(const raw of ['',null,'null','[]','invalid','{}'])assert.deepEqual(readStudyTimer(raw,'biology'),{subject:'biology',accumulated:0,startedAt:null});
});
test('timer rejects corrupted durations and timestamps',()=>{
  for(const value of [{subject:'math',accumulated:-1,startedAt:null},{subject:'math',accumulated:'1',startedAt:null},{subject:'math',accumulated:0,startedAt:'now'},{subject:1,accumulated:0,startedAt:null}])assert.deepEqual(readStudyTimer(JSON.stringify(value)),{subject:'none',accumulated:0,startedAt:null});
  assert.deepEqual(readStudyTimer('{"subject":"math","accumulated":1e999,"startedAt":null}'),{subject:'none',accumulated:0,startedAt:null});
});

test('reset clears active and paused time, keeps subject and survives restoring storage',()=>{
  for(const startedAt of [123456,null]){
    const timer={subject:'math',accumulated:65000,startedAt};
    const before=structuredClone(timer);
    const reset=resetStudyTimer(timer);
    assert.deepEqual(reset,{subject:'math',accumulated:0,startedAt:null});
    assert.deepEqual(readStudyTimer(JSON.stringify(reset)),reset);
    assert.deepEqual(timer,before);
  }
  assert.deepEqual(resetStudyTimer({subject:'none'}),{subject:'none',accumulated:0,startedAt:null});
});
