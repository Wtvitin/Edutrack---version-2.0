import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('scripts do servidor usam a CA do sistema sem desabilitar TLS', () => {
  assert.match(packageJson.scripts.dev, /^node --use-system-ca server\/start\.mjs --dev$/);
  assert.match(packageJson.scripts.start, /^node --use-system-ca server\/start\.mjs$/);
  assert.equal(packageJson.engines.node, '>=22.15.0');
  assert.doesNotMatch(packageJson.scripts.dev, /NODE_TLS_REJECT_UNAUTHORIZED|--tls-min-v1\.0/);
  assert.doesNotMatch(packageJson.scripts.start, /NODE_TLS_REJECT_UNAUTHORIZED|--tls-min-v1\.0/);
});
