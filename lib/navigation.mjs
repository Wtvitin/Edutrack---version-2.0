export function internalDestination(path,origin){
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))throw new Error('Destino interno inválido.');
  const target=new URL(path,origin);
  if(target.origin!==new URL(origin).origin||target.username||target.password)throw new Error('Destino interno inválido.');
  return target.href;
}
export function isSameDocumentDestination(path,currentHref){
  const current=new URL(currentHref);
  const destination=new URL(path,currentHref);
  return destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search&&destination.hash===current.hash;
}
