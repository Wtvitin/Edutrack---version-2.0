"use client";
import {CalendarDays, Check, Clock3, Edit3} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {dueLabel, formatMinutes, priorityLabels, type StudyData, type Task} from '@/lib/edutrack';
const statuses = {TODO:'A fazer', IN_PROGRESS:'Em andamento', COMPLETED:'Concluída', CANCELLED:'Cancelada'};
const difficulty = {EASY:'Fácil', MEDIUM:'Média', HARD:'Difícil'};
export function TaskDetails({task, data, onClose, editTask, toggle}: {task?:Task; data:StudyData; onClose:()=>void; editTask:(task:Task)=>void; toggle:(id:string)=>void}) {
  return <Dialog open={!!task} onOpenChange={open => !open && onClose()}><DialogContent className="edu-dialog task-detail-dialog">
    <DialogTitle>{task?.title || 'Detalhes da tarefa'}</DialogTitle><DialogDescription>Prazo, prioridade e anotações desta atividade.</DialogDescription>
    {task && <><div className="task-detail-meta"><span className={`priority-tag priority-${task.priority}`}>{priorityLabels[task.priority]}</span><span className="pill">{statuses[task.status || (task.done ? 'COMPLETED' : 'TODO')]}</span></div>
      <dl className="task-detail-list"><div><dt>Disciplina</dt><dd>{data.subjects.find(s => s.id === task.subjectId)?.name || 'Sem disciplina'}</dd></div>
        <div><dt><CalendarDays size={15}/>Prazo</dt><dd>{dueLabel(task.due)}{task.due && ` · ${task.due.split('-').reverse().join('/')}`}</dd></div>
        <div><dt><Clock3 size={15}/>Tempo estimado</dt><dd>{task.estimatedMinutes ? formatMinutes(task.estimatedMinutes) : 'Não informado'}</dd></div>
        <div><dt>Dificuldade</dt><dd>{task.difficulty ? difficulty[task.difficulty] : 'Não informada'}</dd></div>
        {task.completedAt && <div><dt>Concluída em</dt><dd>{new Date(task.completedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} (Brasília)</dd></div>}</dl>
      <div className="task-detail-notes"><h3>Anotações</h3><p>{task.description || 'Nenhuma anotação adicionada.'}</p></div>
      <div className="inline-actions wrap"><button className="button secondary" onClick={() => {onClose(); editTask(task);}}><Edit3 size={17}/>Editar tarefa</button><button className="button primary" disabled={task.status === 'CANCELLED'} onClick={() => {toggle(task.id); onClose();}}><Check size={17}/>{task.done ? 'Reabrir tarefa' : 'Concluir tarefa'}</button></div>
    </>}
  </DialogContent></Dialog>;
}
