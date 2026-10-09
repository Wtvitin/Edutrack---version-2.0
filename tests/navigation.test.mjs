import test from 'node:test';
import assert from 'node:assert/strict';
import {internalDestination,isSameDocumentDestination} from '../lib/navigation.mjs';

test('internal navigation retains paths, query parameters and anchors',()=>{
  assert.equal(internalDestination('/tarefas?priority=alta#lista','http://localhost:4175'),'http://localhost:4175/tarefas?priority=alta#lista');
  assert.equal(internalDestination('/','http://localhost:4175'),'http://localhost:4175/');
});
test('internal navigation rejects external and executable destinations',()=>{
  for(const path of ['//example.com','/\\example.com','https://example.com','javascript:alert(1)','data:text/html,test','login',null])assert.throws(()=>internalDestination(path,'http://localhost:4175'),/Destino interno inválido/);
});
test('same-document navigation identifies the active destination without collapsing real navigation',()=>{
  assert.equal(isSameDocumentDestination('/agente','http://localhost:4175/agente'),true);
  assert.equal(isSameDocumentDestination('/agente?tab=historico','http://localhost:4175/agente?tab=historico'),true);
  assert.equal(isSameDocumentDestination('/agente','http://localhost:4175/tarefas'),false);
  assert.equal(isSameDocumentDestination('/agente?tab=historico','http://localhost:4175/agente?tab=overview'),false);
  assert.equal(isSameDocumentDestination('/agente#chat','http://localhost:4175/agente'),false);
});
