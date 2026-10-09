export function internalDestination(path,origin){
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))throw new Error('Destino interno inválido.');
  const target=new URL(path,origin);
  if(target.origin!==new URL(origin).origin||target.username||target.password)throw new Error('Destino interno inválido.');
  return target.href;
}
