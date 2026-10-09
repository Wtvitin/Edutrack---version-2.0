// Shared deterministic policy. Priority is the user's importance choice;
// deadline attention is calculated, never written back to a task or to Google.
export const priorityPolicy = {
  baixa: {label: 'Baixa', rank: 0, reminderDays: 1, description: 'Pode esperar; faça depois das mais importantes no mesmo grupo de prazo.'},
  normal: {label: 'Normal', rank: 1, reminderDays: 2, description: 'Rotina de estudos; planeje no seu ritmo dentro do prazo.'},
  alta: {label: 'Alta', rank: 2, reminderDays: 3, description: 'Importante; reserve tempo antes das tarefas normais no mesmo grupo de prazo.'},
  urgente: {label: 'Urgente', rank: 3, reminderDays: 7, description: 'Atenção prioritária; vem primeiro no mesmo grupo de prazo, mesmo sem data.'},
};
/** @param {string} value @returns {keyof typeof priorityPolicy} */
export function normalizePriority(value) {
  /** @type {Record<string, keyof typeof priorityPolicy>} */
  const aliases = {LOW: 'baixa', MEDIUM: 'normal', HIGH: 'alta', URGENT: 'urgente'};
  return Object.hasOwn(priorityPolicy, value) ? /** @type {keyof typeof priorityPolicy} */ (value) : aliases[value] || 'normal';
}
/** @param {Date} [date] */
export function brasiliaDay(date = new Date()) {
  return date.toLocaleDateString('en-CA', {timeZone: 'America/Sao_Paulo'});
}
/** @param {string} day */
function dayNumber(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const value = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== day ? null : Math.floor(value.getTime() / 86400000);
}
/** @typedef {{id?:string,title?:string,due:string,priority:string,done?:boolean,status?:string}} AttentionTask */
/** @param {AttentionTask} task @param {string} today */
export function deadlineAttention(task, today) {
  const due = dayNumber(task.due), current = dayNumber(today);
  const days = due === null || current === null ? null : due - current;
  const active = !task.done && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
  const priority = normalizePriority(task.priority), policy = priorityPolicy[priority];
  const group = !active ? 4 : days === null ? 3 : days < 0 ? 0 : days <= 1 ? 1 : days <= 3 ? 2 : 3;
  const message = !active || days === null || days < 0 ? ''
    : days === 0 ? 'Entrega hoje' : days === 1 ? 'Entrega amanhã' : `Entrega em ${days} dias`;
  return {days, active, priority, group, message, reminder: active && days !== null && days >= 0 && days <= policy.reminderDays,
    tone: days !== null && days < 0 ? 'overdue' : days !== null && days <= 1 ? 'imminent' : 'upcoming'};
}
/** @param {AttentionTask} a @param {AttentionTask} b @param {string} today */
export function compareTaskAttention(a, b, today) {
  const left = deadlineAttention(a, today), right = deadlineAttention(b, today);
  return left.group - right.group || priorityPolicy[right.priority].rank - priorityPolicy[left.priority].rank
    || (a.due || '9999').localeCompare(b.due || '9999')
    || (a.title || '').localeCompare(b.title || '', 'pt-BR') || (a.id || '').localeCompare(b.id || '');
}
