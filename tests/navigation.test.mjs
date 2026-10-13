import test from 'node:test';
import assert from 'node:assert/strict';
import {internalDestination,isSameDocumentDestination,isStudyPath,canNavigateWithinStudy} from '../lib/navigation.mjs';

test('internal navigation retains paths, query parameters and anchors',()=>{
  assert.equal(internalDestination('/tarefas?priority=alta#lista','http://localhost:4175'),'http://localhost:4175/tarefas?priority=alta#lista');
  assert.equal(internalDestination('/','http://localhost:4175'),'http://localhost:4175/');
});

test('study navigation preserves workspace only between known study routes',()=>{
  for(const path of ['/','/tarefas','/integracoes','/disciplinas/abc','/relatorios/'])assert.equal(isStudyPath(path),true);
  for(const path of ['/login','/cadastro','/demo','/inicio','/tarefas/extra','/disciplinas/abc/extra','/api/data','/unknown'])assert.equal(isStudyPath(path),false);
  assert.equal(canNavigateWithinStudy('/calendario?priority=alta#dia','http://localhost:4175/tarefas'),true);
  assert.equal(canNavigateWithinStudy('/login','http://localhost:4175/tarefas'),false);
  assert.equal(canNavigateWithinStudy('/','http://localhost:4175/login'),false);
  assert.throws(()=>canNavigateWithinStudy('//evil.test','http://localhost:4175/tarefas'));
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
