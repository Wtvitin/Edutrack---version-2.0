// WebSocket connections can disappear while Next sends a refresh update.
// Handle both peers before writing: a socket error must not crash the API.
export function connectUpgradeSockets(socket,upstream,head,buffer,headers){
  const close=()=>{socket.destroy();upstream.destroy();};
  socket.on('error',close);upstream.on('error',close);
  socket.on('close',()=>upstream.destroy());upstream.on('close',()=>socket.destroy());
  if(socket.destroyed||upstream.destroyed){close();return;}
  socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
  upstream.write(head);socket.write(buffer);
  upstream.pipe(socket);socket.pipe(upstream);
}
