"""Deterministic analytics. Input is an authorized, minimized API snapshot; no DB access."""
import json
import sys
from datetime import date, timedelta
import pandas as pd

def prepare(payload):
    today = date.fromisoformat(payload['today'])
    days = int(payload.get('days', 7))
    if days not in (7, 30, 90):
        raise ValueError('Invalid period')
    start = today - timedelta(days=days - 1)
    previous = start - timedelta(days=days)
    selected = payload.get('subject', 'all')
    data = payload['data']
    sessions = pd.DataFrame(data['sessions'], columns=['subjectId', 'date', 'minutes'])
    if selected != 'all':
        sessions = sessions[sessions.subjectId == selected]
    current = sessions[(sessions.date >= start.isoformat()) & (sessions.date <= today.isoformat())]
    old = sessions[(sessions.date >= previous.isoformat()) & (sessions.date < start.isoformat())]
    totals = current.groupby('date')['minutes'].sum().to_dict()
    tasks = [t for t in data['tasks'] if selected == 'all' or t['subjectId'] == selected]
    active = [t for t in tasks if not t['done'] and t.get('status') != 'CANCELLED']
    completed = [t for t in tasks if t['done'] and t.get('completedAt') and start.isoformat() <= t['completedAt'][:10] <= today.isoformat()]
    minutes = int(current.minutes.sum())
    old_minutes = int(old.minutes.sum())
    distribution = []
    for subject in data['subjects']:
        if selected != 'all' and subject['id'] != selected:
            continue
        subset = [t for t in active if t['subjectId'] == subject['id']]
        distribution.append({'name':subject['name'], 'minutes':int(current[current.subjectId == subject['id']].minutes.sum()), 'pending':len(subset), 'estimatedMinutes':sum(t.get('estimatedMinutes') or 0 for t in subset)})
    return {'days':days,'start':start.isoformat(),'end':today.isoformat(),'minutes':minutes,'previousMinutes':old_minutes,'changePercent':round((minutes-old_minutes)/old_minutes*100,1) if old_minutes else None,'activeDays':len(totals),'sessions':len(current),'averageSession':round(minutes/len(current),1) if len(current) else 0,'completed':len(completed),'pending':len(active),'overdue':sum(bool(t['due']) and t['due'] < today.isoformat() for t in active),'urgent':sum(t['priority'] == 'urgente' for t in active),'estimatedMinutes':sum(t.get('estimatedMinutes') or 0 for t in active),'daily':[{'date':(start+timedelta(days=i)).isoformat(),'minutes':int(totals.get((start+timedelta(days=i)).isoformat(),0))} for i in range(days)],'subjects':distribution}

if __name__ == '__main__':
    print(json.dumps(prepare(json.load(sys.stdin)), ensure_ascii=False))
