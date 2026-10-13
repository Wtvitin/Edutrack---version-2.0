import test from 'node:test';
import assert from 'node:assert/strict';
import {Duplex} from 'node:stream';
import {setImmediate} from 'node:timers/promises';
import {connectUpgradeSockets} from '../server/proxy-upgrade.mjs';
function peer(){const writes=[];const stream=new Duplex({read(){},write(chunk,encoding,done){writes.push(chunk.toString());done();}});stream.writes=writes;return stream;}
test('refresh upgrade forwards handshake and buffered data',()=>{
  const client=peer(),upstream=peer();
  connectUpgradeSockets(client,upstream,Buffer.from('head'),Buffer.from('buffer'),{upgrade:'websocket'});
  assert.ok(client.writes[0].startsWith('HTTP/1.1 101 Switching Protocols'));
  assert.equal(client.writes[1],'buffer');assert.equal(upstream.writes[0],'head');
  client.destroy();upstream.destroy();
});
for(const side of ['client','upstream'])test(`refresh ${side} reset closes both peers without uncaught error`,async()=>{
  const client=peer(),upstream=peer();
  connectUpgradeSockets(client,upstream,Buffer.alloc(0),Buffer.alloc(0),{});
  (side==='client'?client:upstream).destroy(Object.assign(new Error('Connection aborted'),{code:'ECONNABORTED'}));
  await setImmediate();assert.ok(client.destroyed);assert.ok(upstream.destroyed);
});
test('an already closed browser does not receive a handshake',()=>{
  const client=peer(),upstream=peer();client.destroy();
  connectUpgradeSockets(client,upstream,Buffer.alloc(0),Buffer.alloc(0),{});
  assert.equal(client.writes.length,0);assert.ok(upstream.destroyed);
});
