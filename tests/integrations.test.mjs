import test from 'node:test';
import assert from 'node:assert/strict';
import {filterIntegrations,integrationCategories,integrations} from '../lib/integrations.ts';

test('catálogo tem seis aplicativos distintos, sem conexões simuladas',()=>{
  assert.equal(integrations.length,6);
  assert.equal(new Set(integrations.map(app=>app.id)).size,6);
  assert.ok(integrations.every(app=>app.status==='planned'));
  assert.equal(integrations[0].id,'google-classroom');
});
test('busca ignora acentos, caixa e espaços externos',()=>{
  assert.deepEqual(filterIntegrations('  GOOGLE AGENDA ').map(app=>app.id),['google-calendar']);
  assert.ok(filterIntegrations('instituicao').some(app=>app.id==='moodle'));
  assert.equal(filterIntegrations('aplicativo inexistente').length,0);
  assert.equal(filterIntegrations(' ').length,6);
});
test('categoria e busca são combinadas sem alterar o catálogo',()=>{
  assert.equal(filterIntegrations('', 'classroom').length,4);
  assert.deepEqual(filterIntegrations('', 'organization').map(app=>app.id),['notion']);
  assert.deepEqual(filterIntegrations('google','calendar').map(app=>app.id),['google-calendar']);
  assert.equal(filterIntegrations('notion','classroom').length,0);
  assert.equal(integrations.length,6);
});
test('cada proposta apresenta limites e link oficial HTTPS sem credenciais',()=>{
  for(const app of integrations){
    assert.ok(integrationCategories.some(category=>category.id===app.category));
    assert.equal(app.proposedFeatures.length,3);
    assert.ok(app.requirement.length>20);
    const url=new URL(app.officialUrl);
    assert.equal(url.protocol,'https:');
    assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.search,'');
  }
});
