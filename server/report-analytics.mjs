import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Separate from analytics.mjs: the existing Agent keeps its current implementation.
export function prepareReportAnalytics(data, days, subject, {python = process.env.PYTHON_BIN || 'python', today = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Sao_Paulo'}), timeoutMs = 15000} = {}) {
  const safe = {
    subjects: data.subjects.map(s => ({id: s.id, name: s.name})),
    sessions: data.sessions.map(s => ({subjectId: s.subjectId, date: s.date, minutes: s.minutes})),
    tasks: data.tasks.map(t => ({subjectId: t.subjectId, due: t.due, done: t.done, status: t.status,
      priority: t.priority, estimatedMinutes: t.estimatedMinutes,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-CA', {timeZone: 'America/Sao_Paulo'}) : null})),
  };
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-X', 'utf8', fileURLToPath(new URL('../analytics/prepare.py', import.meta.url))], {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
    let output = '', size = 0, settled = false;
    const finish = (error, result) => {if (settled) return; settled = true; clearTimeout(timer); if (error) reject(error); else resolve(result);};
    const timer = setTimeout(() => {child.kill(); finish(new Error('Reports timeout'));}, timeoutMs);
    child.stdout.on('data', chunk => {size += chunk.length; if (size > 2e6) {child.kill(); finish(new Error('Reports too large'));} else output += chunk;});
    child.stderr.resume();
    child.on('error', error => finish(error));
    child.stdin.on('error', () => {});
    child.on('close', code => {if (settled) return; try {if (code !== 0) throw new Error('Reports unavailable'); finish(null, JSON.parse(output));} catch (error) {finish(error);}});
    child.stdin.end(JSON.stringify({data: safe, days, subject, today}));
  });
}
