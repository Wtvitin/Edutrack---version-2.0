import {brasiliaDay, compareTaskAttention, deadlineAttention, priorityPolicy} from '../lib/task-attention.mjs';

// One in-app notice per task/deadline; its message evolves as days pass.
// Serialize with snapshot saves, preserving read state without daily duplicates.
export async function readNotifications(db, user, {now = new Date()} = {}) {
  const today = brasiliaDay(now);
  return db.transaction(async tx => {
    const current = (await tx.query('SELECT notifications_enabled FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
    const rows = current?.notifications_enabled ? (await tx.query(`SELECT id,title,priority,due_date,status FROM academic_tasks
      WHERE user_id=$1 AND status IN ('TODO','IN_PROGRESS') AND due_date IS NOT NULL`, [user.id])).rows : [];
    const tasks = rows.map(row => ({...row, due: brasiliaDay(new Date(row.due_date))}));
    const eligible = tasks.filter(task => deadlineAttention(task, today).reminder);
    await tx.query(`UPDATE notification_deliveries SET status='CANCELLED'
      WHERE user_id=$1 AND status IN ('PENDING','SENT') AND type IN ('TASK_DUE_24H','TASK_DEADLINE')`, [user.id]);
    if (eligible.length) await tx.query(`INSERT INTO notification_deliveries(user_id,task_id,type,status,scheduled_at,sent_at,read_at)
      SELECT $1,item.id,'TASK_DEADLINE','SENT',item.due_date,now(),legacy.read_at
      FROM jsonb_to_recordset($2::jsonb) AS item(id uuid,due_date timestamptz)
      LEFT JOIN notification_deliveries legacy ON legacy.user_id=$1 AND legacy.task_id=item.id
        AND legacy.scheduled_at=item.due_date AND legacy.type='TASK_DUE_24H'
      ON CONFLICT(task_id,type,scheduled_at) DO UPDATE SET status='SENT'`,
      [user.id, JSON.stringify(eligible.map(task => ({id: task.id, due_date: new Date(task.due_date).toISOString()})))]);
    const notices = (await tx.query(`SELECT n.id,n.task_id,n.read_at,n.scheduled_at,t.title,t.priority,t.status
      FROM notification_deliveries n JOIN academic_tasks t ON t.id=n.task_id AND t.user_id=n.user_id
      WHERE n.user_id=$1 AND n.status='SENT' AND n.type='TASK_DEADLINE'`, [user.id])).rows;
    const items = notices.map(notice => {
      const due = brasiliaDay(new Date(notice.scheduled_at)), attention = deadlineAttention({...notice, due}, today);
      return {...notice, due, message: attention.message, tone: attention.tone, priorityLabel: priorityPolicy[attention.priority].label};
    }).sort((a, b) => compareTaskAttention(a, b, today));
    return {items: items.slice(0, 100), unread: items.filter(item => !item.read_at).length, today};
  });
}
