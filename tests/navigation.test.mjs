import test from 'node:test';
import assert from 'node:assert/strict';
import {internalDestination} from '../lib/navigation.mjs';

test('internal navigation retains paths, query parameters and anchors',()=>{
  assert.equal(internalDestination('/tarefas?priority=alta#lista','http://localhost:4175'),'http://localhost:4175/tarefas?priority=alta#lista');
  assert.equal(internalDestination('/','http://localhost:4175'),'http://localhost:4175/');
});
test('internal navigation rejects external and executable destinations',()=>{
  for(const path of ['//example.com','/\\example.com','https://example.com','javascript:alert(1)','data:text/html,test','login',null])assert.throws(()=>internalDestination(path,'http://localhost:4175'),/Destino interno inválido/);
});
