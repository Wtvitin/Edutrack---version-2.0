import type {StudyData, Task} from './edutrack';

export const priorities = ['urgente', 'alta', 'normal', 'baixa'] as const;
const ranks = {urgente: 3, alta: 2, normal: 1, baixa: 0};
export const isPending = (task: Task) => !task.done && task.status !== 'CANCELLED';
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function completionDay(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-CA', {timeZone: 'America/Sao_Paulo'}) : '';
}
export function compareTasks(a: Task, b: Task, today: string) {
  const overdue = (t: Task) => !!t.due && t.due < today && isPending(t);
  return Number(overdue(b)) - Number(overdue(a)) || ranks[b.priority] - ranks[a.priority]
    || (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title, 'pt-BR');
}
export function filterCalendarTasks(tasks: Task[], filters: {subject: string; priority: string; status: string}) {
  return tasks.filter(t => t.status !== 'CANCELLED' && (filters.subject === 'all' || t.subjectId === filters.subject)
    && (filters.priority === 'all' || t.priority === filters.priority)
    && (filters.status === 'all' || (filters.status === 'done' ? t.done : isPending(t))));
}
export function taskCounts(tasks: Task[], today: string) {
  const pending = tasks.filter(isPending);
  return {pending: pending.length, overdue: pending.filter(t => t.due && t.due < today).length,
    upcoming: pending.filter(t => t.due && t.due >= today && t.due <= shiftDay(today, 6)).length,
    urgent: pending.filter(t => t.priority === 'urgente').length,
    withoutDate: pending.filter(t => !t.due).length};
}
export type SubjectMetric = {id: string; name: string; minutes: number; previousMinutes: number; sessions: number; completed: number; pending: number; overdue: number; urgent: number; estimatedMinutes: number};
export type StudyMetrics = {
  days: number; start: string; end: string; minutes: number; previousMinutes: number; changePercent: number | null;
  activeDays: number; sessions: number; averageSession: number; completed: number; previousCompleted: number;
  pending: number; overdue: number; urgent: number; estimatedMinutes: number; estimatedTasks: number; unestimatedTasks: number;
  completedWithDeadline: number; onTimeCompleted: number; onTimeRate: number | null;
  daily: {date: string; minutes: number; previousMinutes: number}[]; subjects: SubjectMetric[];
  priorities: {priority: Task['priority']; count: number; estimatedMinutes: number}[];
};
// Only the device-local demo uses this calculation. Account reports come from Python/Pandas.
export function demoReport(data: StudyData, days: number, subject: string, today: string): StudyMetrics {
  const start = shiftDay(today, 1 - days), previous = shiftDay(start, -days);
  const sessions = data.sessions.filter(s => subject === 'all' || s.subjectId === subject);
  const current = sessions.filter(s => s.date >= start && s.date <= today);
  const old = sessions.filter(s => s.date >= previous && s.date < start);
  const tasks = data.tasks.filter(t => subject === 'all' || t.subjectId === subject);
  const pending = tasks.filter(isPending);
  const completed = tasks.filter(t => t.done && completionDay(t.completedAt) >= start && completionDay(t.completedAt) <= today);
  const previousCompleted = tasks.filter(t => t.done && completionDay(t.completedAt) >= previous && completionDay(t.completedAt) < start).length;
  const withDeadline = completed.filter(t => t.due);
  const onTime = withDeadline.filter(t => completionDay(t.completedAt) <= t.due).length;
  const minutes = current.reduce((n, s) => n + s.minutes, 0), previousMinutes = old.reduce((n, s) => n + s.minutes, 0);
  const sumEstimates = (list: Task[]) => list.reduce((n, t) => n + (t.estimatedMinutes || 0), 0);
  const subjects = [...data.subjects];
  if (sessions.some(s => !s.subjectId) || tasks.some(t => !t.subjectId)) subjects.push({id: '', name: 'Sem disciplina', color: 'purple', description: ''});
  return {days, start, end: today, minutes, previousMinutes,
    changePercent: previousMinutes ? Math.round((minutes - previousMinutes) / previousMinutes * 1000) / 10 : null,
    activeDays: new Set(current.map(s => s.date)).size, sessions: current.length,
    averageSession: current.length ? Math.round(minutes / current.length * 10) / 10 : 0,
    completed: completed.length, previousCompleted, ...taskCounts(tasks, today), estimatedMinutes: sumEstimates(pending),
    estimatedTasks: pending.filter(t => t.estimatedMinutes).length, unestimatedTasks: pending.filter(t => !t.estimatedMinutes).length,
    completedWithDeadline: withDeadline.length, onTimeCompleted: onTime, onTimeRate: withDeadline.length ? Math.round(onTime / withDeadline.length * 1000) / 10 : null,
    daily: Array.from({length: days}, (_, i) => ({date: shiftDay(start, i),
      minutes: current.filter(s => s.date === shiftDay(start, i)).reduce((n, s) => n + s.minutes, 0),
      previousMinutes: old.filter(s => s.date === shiftDay(previous, i)).reduce((n, s) => n + s.minutes, 0)})),
    subjects: subjects.filter(s => subject === 'all' || s.id === subject).map(s => ({id: s.id, name: s.name,
      minutes: current.filter(v => v.subjectId === s.id).reduce((n, v) => n + v.minutes, 0),
      previousMinutes: old.filter(v => v.subjectId === s.id).reduce((n, v) => n + v.minutes, 0),
      sessions: current.filter(v => v.subjectId === s.id).length, completed: completed.filter(t => t.subjectId === s.id).length,
      ...taskCounts(tasks.filter(t => t.subjectId === s.id), today), estimatedMinutes: sumEstimates(pending.filter(t => t.subjectId === s.id))})),
    priorities: priorities.map(priority => ({priority, count: pending.filter(t => t.priority === priority).length,
      estimatedMinutes: sumEstimates(pending.filter(t => t.priority === priority))}))};
}
export function csvCell(value: unknown) {
  // Quoted cells alone do not prevent spreadsheet formula execution.
  const safe = String(value ?? '').replace(/^(\s*[=+\-@\t\r\n])/, "'$1");
  return `"${safe.replaceAll('"', '""')}"`;
}
