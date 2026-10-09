"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Bell,CalendarClock} from 'lucide-react';
import {brasiliaDay,compareTaskAttention,deadlineAttention,priorityPolicy} from '@/lib/task-attention.mjs';
import type {StudyData,Task} from '@/lib/edutrack';
import {api} from './account-store';
import Link from './link';

export type DeadlineNotice={id:string;task_id:string;title:string;due:string;priority:string;priorityLabel:string;message:string;tone:string;scheduled_at:string;read_at:string|null};
type Notices={items:DeadlineNotice[];unread:number;error:string};
const empty:Notices={items:[],unread:0,error:''};
const DeadlineContext=createContext({today:'',notices:empty});
const readKey=(notice:Pick<DeadlineNotice,'id'>)=>`edutrack-deadline-read-${notice.id}`;

export function DeadlineProvider({data,children}:{data:StudyData;children:ReactNode}){
  const [today,setToday]=useState(()=>brasiliaDay()),[notices,setNotices]=useState(empty);
  useEffect(()=>{
    let live=true,busy=false;
    async function refresh(){
      if(document.hidden||busy)return;
      busy=true;
      const day=brasiliaDay();setToday(day);
      try{
        let next:Notices;
        if(data.profile.notificationsEnabled===false)next=empty;
        else if(data.profile.id){
          await window.edutrackFlush?.();
          if(!live)return;
          const result=await api<{items:DeadlineNotice[];unread:number}>('/notifications');
          next={...result,error:''};
        }else{
          const items=data.tasks.filter(t=>deadlineAttention(t,day).reminder).sort((a,b)=>compareTaskAttention(a,b,day)).map(t=>{
            const attention=deadlineAttention(t,day),id=`${t.id}:${t.due}`;
            return {id,task_id:t.id,title:t.title,due:t.due,priority:t.priority,priorityLabel:priorityPolicy[attention.priority].label,
              message:attention.message,tone:attention.tone,scheduled_at:`${t.due}T23:59:59-03:00`,read_at:localStorage.getItem(readKey({id}))};
          });
          next={items,unread:items.filter(i=>!i.read_at).length,error:''};
        }
        if(live)setNotices(next);
      }catch{if(live)setNotices(previous=>({...previous,error:'Não foi possível atualizar os lembretes. Tentaremos novamente com a aba aberta.'}));}
      finally{busy=false;}
    }
    void refresh();
    const timer=window.setInterval(()=>void refresh(),60000);
    const wake=()=>void refresh();
    document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);window.addEventListener('online',wake);window.addEventListener('edutrack-notices-changed',wake);
    return ()=>{live=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);window.removeEventListener('edutrack-notices-changed',wake);};
  },[data.profile.id,data.profile.notificationsEnabled,data.tasks]);
  return <DeadlineContext.Provider value={{today,notices}}>{children}</DeadlineContext.Provider>;
}
export const useStudyDay=()=>useContext(DeadlineContext).today;
export const useDeadlineNotices=()=>useContext(DeadlineContext).notices;
export async function markDeadlineNotices(data:StudyData,items:DeadlineNotice[],id?:string){
  if(data.profile.id)await api('/notifications/read',id?{id}:{});
  else items.filter(i=>!id||i.id===id).forEach(i=>localStorage.setItem(readKey(i),new Date().toISOString()));
  window.dispatchEvent(new Event('edutrack-notices-changed'));
}
export function NotificationBell(){
  const {unread}=useDeadlineNotices();
  return <Link href="/notificacoes" className="icon-button deadline-bell" aria-label={`Abrir notificações${unread?`, ${unread} não lidas`:''}`}><Bell size={20}/>{unread>0&&<span className="deadline-unread" aria-hidden="true">{unread>99?'99+':unread}</span>}</Link>;
}
export function TaskDeadlineMessage({task}:{task:Task}){
  const today=useStudyDay(),attention=deadlineAttention(task,today);
  return attention.reminder?<span className={`task-deadline-message deadline-${attention.tone}`}><CalendarClock size={14}/>{attention.message}</span>:null;
}
export function DeadlineBanner({data}:{data:StudyData}){
  const today=useStudyDay(),{error}=useDeadlineNotices();
  if(data.profile.notificationsEnabled===false)return null;
  const active=data.tasks.filter(t=>deadlineAttention(t,today).reminder);
  if(!active.length&&!error)return null;
  return <aside className="deadline-banner" aria-label="Atenção aos prazos"><CalendarClock size={21}/><div><strong>{active.length?`${active.length} ${active.length===1?'entrega merece':'entregas merecem'} sua atenção`:'Seus lembretes'}</strong>
    {active.length>0&&<p>{active.length} {active.length===1?'entrega próxima':'entregas próximas'}, conforme a prioridade. Os avisos aparecem até a data de entrega, enquanto a tarefa estiver pendente.</p>}
    {error&&<p role="status">{error}</p>}</div><Link className="text-link" href="/notificacoes">Ver lembretes →</Link></aside>;
}
export function PriorityGuide(){
  return <details className="priority-guide"><summary>Como funcionam as prioridades e os avisos?</summary><p>O prazo define o grupo de atenção: atrasadas → hoje/amanhã → em 2–3 dias → demais. Dentro de cada grupo, a importância escolhida ordena as tarefas: Urgente → Alta → Normal → Baixa; depois, o prazo mais próximo.</p>
    <div className="priority-guide-grid">{Object.entries(priorityPolicy).reverse().map(([key,policy])=><div key={key}><strong className={`priority-tag priority-${key}`}>{policy.label}</strong><p>{policy.description}</p><small>Lembrete a partir de {policy.reminderDays} {policy.reminderDays===1?'dia':'dias'} antes da entrega.</small></div>)}</div>
    <p>Sem prazo, a prioridade organiza a fila, mas não gera lembrete. Os lembretes aparecem somente até a data de entrega. Concluídas e canceladas não geram avisos. Os dias seguem o calendário de Brasília, não uma contagem de horas. A prioridade não é alterada automaticamente.</p><p>São lembretes dentro do aplicativo, não e-mail nem push com o app fechado. Marcar como lido remove o contador, não conclui a tarefa.</p></details>;
}
