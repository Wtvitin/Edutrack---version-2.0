"use client";
import {useState} from 'react';
import {ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, Plus, TriangleAlert} from 'lucide-react';
import {dateKey, formatMinutes, priorityLabels, type Task} from '@/lib/edutrack';
import {compareTasks, filterCalendarTasks, isPending, priorities, shiftDay} from '@/lib/study-planning';
import {Panel, PanelHeader, TaskRow} from './app';
import {Heading, type ViewProps} from './views';
import {Choice} from './forms';
import {TaskDetails} from './task-details';

const prettyDay = (day:string) => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
export function CalendarView({data,toggle,editTask}:ViewProps) {
  const today = dateKey();
  const [month,setMonth] = useState(today.slice(0,7)), [selected,setSelected] = useState(today);
  const [subject,setSubject] = useState('all'), [priority,setPriority] = useState('all'), [status,setStatus] = useState('pending');
  const [view,setView] = useState('month'), [detailId,setDetailId] = useState(''), [showOverdue,setShowOverdue] = useState(false);
  const monthDate = new Date(`${month}-01T12:00:00`), start = (monthDate.getDay()+6)%7;
  const count = new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate();
  const days = Array.from({length:Math.ceil((start+count)/7)*7},(_,i)=>i-start+1);
  const visible = filterCalendarTasks(data.tasks,{subject,priority,status}).sort((a,b)=>compareTasks(a,b,today));
  const monthTasks = visible.filter(t=>t.due.startsWith(month));
  const overdue = visible.filter(t=>isPending(t)&&t.due&&t.due<today);
  const undated = visible.filter(t=>isPending(t)&&!t.due);
  const selectedTasks = visible.filter(t=>t.due===selected);
  const studySessions = data.sessions.filter(s=>subject==='all'||s.subjectId===subject);
  const minutes = studySessions.filter(s=>s.date===selected).reduce((n,s)=>n+s.minutes,0);
  const agendaDays = [...new Set([...monthTasks.map(t=>t.due), ...studySessions.filter(s=>s.date.startsWith(month)).map(s=>s.date)])].sort();
  function chooseMonth(value:string) {if(!/^\d{4}-\d{2}$/.test(value))return;setMonth(value);setSelected(`${value}-01`);setShowOverdue(false);}
  function shift(delta:number) {const next=new Date(monthDate.getFullYear(),monthDate.getMonth()+delta,1);chooseMonth(dateKey(next).slice(0,7));}
  function newTask() {editTask({id:'',title:'',description:'',due:selected,done:false,priority:'normal',subjectId:subject==='all'?data.subjects[0]?.id||'':subject});}
  function taskLine(task:Task) {return <div key={task.id} className="calendar-task-item"><TaskRow task={task} data={data} toggle={toggle}/><button className="icon-button" aria-label={`Detalhes de ${task.title}`} onClick={()=>setDetailId(task.id)}><ArrowRight size={18}/></button></div>;}
  return <div className="calendar-page-v2"><Heading title="Dê espaço aos seus planos" description="Entregas, sessões e prioridades reunidas. Selecione um dia para ver os detalhes." action={<button className="button primary" onClick={newTask}><Plus size={18}/>Nova tarefa</button>}/>
    <div className="calendar-toolbar"><Choice id="calendar-subject" label="Disciplina" value={subject} onChange={setSubject} options={[{value:'all',label:'Todas as disciplinas'},...data.subjects.map(s=>({value:s.id,label:s.name}))]}/>
      <Choice id="calendar-priority" label="Prioridade" value={priority} onChange={setPriority} options={[{value:'all',label:'Todas as prioridades'},...priorities.map(p=>({value:p,label:priorityLabels[p]}))]}/>
      <Choice id="calendar-status" label="Situação" value={status} onChange={setStatus} options={[{value:'pending',label:'Pendentes'},{value:'done',label:'Concluídas'},{value:'all',label:'Todas (exceto canceladas)'}]}/>
      <div className="calendar-view-toggle" aria-label="Visualização do calendário"><button aria-pressed={view==='month'} onClick={()=>setView('month')}><LayoutGrid size={17}/>Mês</button><button aria-pressed={view==='agenda'} onClick={()=>setView('agenda')}><List size={17}/>Agenda</button></div>
    </div>
    <div className="calendar-summary"><span><CalendarDays size={17}/><strong>{monthTasks.filter(isPending).length}</strong> entregas pendentes neste mês</span><button aria-pressed={showOverdue} onClick={()=>setShowOverdue(!showOverdue)}><TriangleAlert size={17}/><strong>{overdue.length}</strong> atrasadas nos filtros atuais<ArrowRight size={15}/></button><span><Clock3 size={17}/>{formatMinutes(studySessions.filter(s=>s.date.startsWith(month)).reduce((n,s)=>n+s.minutes,0))} registradas no mês</span></div>
    {showOverdue && <Panel className="overdue-panel"><PanelHeader title="Entregas atrasadas — todos os meses"/>{overdue.length?overdue.map(taskLine):<p className="empty-message">Nenhuma pendência atrasada nesses filtros.</p>}</Panel>}
    <div className="calendar-layout"><Panel className="calendar-month-panel"><div className="panel-heading calendar-heading"><div><h2>{monthDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><label className="calendar-month-picker"><span className="sr-only">Ir para um mês</span><input type="month" aria-label="Ir para um mês" value={month} onChange={e=>chooseMonth(e.target.value)}/></label></div><div className="inline-actions"><button className="icon-button" aria-label="Mês anterior" onClick={()=>shift(-1)}><ChevronLeft size={20}/></button><button className="button secondary" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>Hoje</button><button className="icon-button" aria-label="Próximo mês" onClick={()=>shift(1)}><ChevronRight size={20}/></button></div></div>
      {view==='month' ? <><div className="calendar-grid" aria-label="Dias do mês">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><span className="weekday" key={d}>{d}</span>)}{days.map((day,i)=>{
        if(day<1||day>count)return <div className="calendar-blank" key={i} aria-hidden="true"/>;
        const key=`${month}-${String(day).padStart(2,'0')}`, due=visible.filter(t=>t.due===key), study=studySessions.filter(s=>s.date===key).reduce((n,s)=>n+s.minutes,0);
        return <button key={key} data-calendar-date={key} tabIndex={key===selected?0:-1} className={`calendar-day ${key===selected?'selected':''} ${key===today?'is-today':''} ${due.some(t=>isPending(t)&&key<today)?'has-overdue':''}`} onClick={()=>setSelected(key)} aria-current={key===today?'date':undefined} aria-label={`${prettyDay(key)}, ${due.length} tarefas, ${study} minutos de estudo`} aria-pressed={key===selected} onKeyDown={e=>{const offset:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(offset[e.key]===undefined)return;e.preventDefault();const next=shiftDay(key,offset[e.key]);setSelected(next);setMonth(next.slice(0,7));requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-calendar-date="${next}"]`)?.focus());}}>
          <span>{day}</span>{due.slice(0,2).map(t=><span key={t.id} className={`calendar-event priority-${t.priority} ${t.done?'event-done':''}`}>{t.title}</span>)}{due.length>2&&<small className="calendar-overflow">+{due.length-2}</small>}{study>0&&<span className="calendar-study-dot"><Clock3 size={11}/><span>{formatMinutes(study)}</span></span>}
        </button>;
      })}</div><p className="form-note calendar-keyboard-tip">Use as setas do teclado para navegar entre os dias.</p></>
      : <div className="calendar-agenda">{agendaDays.length?agendaDays.map(day=><section key={day} className={`agenda-day ${selected===day?'selected':''}`}><button className="agenda-date" onClick={()=>setSelected(day)} aria-pressed={selected===day}><strong>{prettyDay(day)}</strong><ArrowRight size={16}/></button>{visible.filter(t=>t.due===day).map(taskLine)}{studySessions.filter(s=>s.date===day).map(s=><div className="agenda-study" key={s.id}><Clock3 size={16}/><span>{data.subjects.find(sub=>sub.id===s.subjectId)?.name||'Sem disciplina'}</span><strong>{formatMinutes(s.minutes)}</strong></div>)}</section>):<div className="empty-state"><CalendarDays size={28}/><h3>Este mês está livre nesses filtros</h3><p>Mude o mês ou planeje sua próxima atividade.</p></div>}</div>}
      <div className="calendar-legend">{priorities.map(p=><span key={p}><i className={`priority-dot priority-${p}`}/>{priorityLabels[p]}</span>)}<span><i className="study-dot"/>Estudo registrado</span></div>
    </Panel><div className="calendar-side"><Panel className="selected-day-panel"><PanelHeader title={prettyDay(selected)}/><p className="form-note">{selectedTasks.length} tarefas · {minutes?formatMinutes(minutes)+' de estudo':'sem estudo registrado'}</p>{selectedTasks.length?selectedTasks.map(taskLine):<div className="empty-state compact-empty"><CalendarDays size={25}/><h3>Um dia com espaço</h3><p>Nenhuma entrega para essa data nos filtros atuais.</p></div>}<button className="button secondary full-width" onClick={newTask}><Plus size={17}/>Planejar neste dia</button></Panel>
      <Panel className="undated-panel"><PanelHeader title="Ainda sem prazo"/><p className="form-note">{undated.length} pendências sem data nos filtros atuais.</p>{undated.slice(0,4).map(t=><button key={t.id} className="undated-task" onClick={()=>setDetailId(t.id)}><span className={`priority-dot priority-${t.priority}`}/><span>{t.title}</span><ArrowRight size={15}/></button>)}{!undated.length&&<p className="form-note">Nada por aqui. Seus prazos estão organizados.</p>}</Panel></div></div>
    <TaskDetails task={data.tasks.find(t=>t.id===detailId)} data={data} onClose={()=>setDetailId('')} toggle={toggle} editTask={editTask}/>
  </div>;
}
