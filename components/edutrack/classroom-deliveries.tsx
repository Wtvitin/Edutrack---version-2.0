"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {createClassroomPoller,submissionLabels} from '@/lib/classroom-polling.mjs';

type SubmissionState=keyof typeof submissionLabels;
type Delivery={taskId:string;state:SubmissionState;late:boolean|null;checkedAt:string|null};
type DeliverySnapshot={configured:boolean;connected:boolean;checkedAt:string|null;nextCheckAt:string;error:string|null;items:Delivery[]};
const empty:DeliverySnapshot={configured:false,connected:false,checkedAt:null,nextCheckAt:'',error:null,items:[]};
let snapshot=empty;
const listeners=new Set<()=>void>();
function publish(next:DeliverySnapshot){snapshot=next;listeners.forEach(listener=>listener());}
function subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
const clientSnapshot=()=>snapshot;
const serverSnapshot=()=>empty;
function useDeliveries(){return useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);}

export function useClassroomDeliveryPolling(enabled:boolean){
  useEffect(()=>{
    publish(empty);
    if(!enabled)return;
    return createClassroomPoller({
      async request(signal:AbortSignal){
        const response=await fetch('/api/integrations/classroom/deliveries',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal});
        const result=await response.json() as DeliverySnapshot&{message?:string};
        if(response.status===401)publish(empty);
        if(!response.ok)throw new Error(result.message||'Não foi possível atualizar as entregas.');
        return result as DeliverySnapshot;
      },
      onResult:publish,
      onError(error:unknown){publish({...snapshot,error:error instanceof Error?error.message:'Consulta indisponível. Tentaremos novamente automaticamente.'});},
      isVisible:()=>document.visibilityState==='visible',
      subscribe(wake:()=>void,changed:()=>void){
        const change=()=>{publish(empty);changed();};
        window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
        window.addEventListener('online',wake);window.addEventListener('edutrack-classroom-changed',change);
        return ()=>{window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);window.removeEventListener('edutrack-classroom-changed',change);};
      },
    });
  },[enabled]);
}

export function ClassroomTaskBadge({taskId}:{taskId:string}){
  const remote=useDeliveries();
  const item=remote.items.find(item=>item.taskId===taskId);
  if(!remote.connected||!item)return null;
  const stale=!!remote.error;
  const label=submissionLabels[item.state]||submissionLabels.UNKNOWN;
  return <small className={`classroom-delivery-badge ${item.state==='TURNED_IN'?'is-delivered':''}`} title={item.checkedAt?`Consultado em ${new Date(item.checkedAt).toLocaleString('pt-BR')}. Não altera a conclusão local.`:'Ainda não foi possível consultar a entrega.'}>
    {label}{item.late?' · em atraso':''}{stale?' · última informação disponível':''}
  </small>;
}

export function ClassroomDeliveryStatus(){
  const remote=useDeliveries();
  if(!remote.connected)return null;
  return <aside className="classroom-delivery-status" aria-label="Atualização das entregas do Classroom">
    <strong>Entregas do Classroom · atualização automática</strong>
    <p>{remote.items.length?'Consulta a cada 2 minutos enquanto esta aba estiver visível.':'Importe as atividades das turmas escolhidas para acompanhar suas entregas.'} Concluir no EduTrack não entrega trabalhos no Google.</p>
    <p>Última consulta: {remote.checkedAt?new Date(remote.checkedAt).toLocaleString('pt-BR'):'ainda não realizada'}.</p>
    {remote.error&&<p role="status" className="classroom-delivery-warning">{remote.error} Os dados anteriores podem estar desatualizados; tentaremos novamente automaticamente.</p>}
  </aside>;
}
