import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
test('Next image processing works with its installed Sharp dependency', async () => {
  const nextRequire = createRequire(require.resolve('next/package.json'));
  const sharp = nextRequire('sharp');
  const { data, info } = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 100, g: 50, b: 200, alpha: 1 } } }).png().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1); assert.equal(info.height, 1); assert.equal(info.format, 'png'); assert.ok(data.length > 0);
});
test('Framework entrypoints use Next and vulnerable legacy packages are absent', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const name of ['vinext', 'vite-plugin-commonjs', 'vite-plugin-dynamic-import', 'eslint-config-next', '@next/eslint-plugin-next', 'braces']) {
    assert.ok(!Object.keys(lock.packages).some(path => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`), `${name} must not be installed`);
  }
  for (const file of ['../scripts/run-framework.mjs', '../server/start.mjs']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(source.includes('node_modules/next/dist/bin/next'));
    assert.ok(!source.includes('node_modules/vinext'));
  }
  const link = readFileSync(new URL('../components/edutrack/link.tsx', import.meta.url), 'utf8');
  assert.ok(link.startsWith('"use client";'), 'Interactive links need a client boundary when used by the server-side 404 page');
});
