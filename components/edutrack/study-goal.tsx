"use client";
import {useState} from 'react';
import {Target} from 'lucide-react';
import {toast} from 'sonner';
import {Panel, PanelHeader} from './app';
import {formatMinutes} from '@/lib/edutrack';
import type {ViewProps} from './views';

export function StudyGoal({data, setData}: Pick<ViewProps, 'data' | 'setData'>) {
  const [minutes, setMinutes] = useState(String(data.profile.weeklyGoalMinutes || 0));
  return <Panel className="study-goal-settings"><PanelHeader title="Sua meta semanal"/>
    <p className="section-description">Escolha um ritmo possível para você. A meta acompanha os últimos sete dias e não mede aprendizado.</p>
    <form className="edu-form" onSubmit={e => {e.preventDefault(); const value = Number(minutes);
      if (!Number.isInteger(value) || value < 0 || value > 10080) return toast.error('Informe de 0 a 10080 minutos.');
      setData(p => ({...p, profile: {...p.profile, weeklyGoalMinutes: value}})); toast.success('Meta semanal atualizada.');}}>
      <div className="field"><label htmlFor="weekly-goal">Minutos por semana</label><input id="weekly-goal" type="number" min={0} max={10080} step={1} value={minutes} onChange={e => setMinutes(e.target.value)} required/>
        <small className="form-note">{Number(minutes) > 0 ? formatMinutes(Number(minutes)) : 'Use 0 para não acompanhar uma meta.'}</small></div>
      <div className="goal-presets" aria-label="Sugestões de meta">{[150, 300, 600].map(n => <button type="button" className="button secondary" key={n} onClick={() => setMinutes(String(n))}>{formatMinutes(n)}</button>)}</div>
      <button className="button primary"><Target size={17}/>Salvar meta</button>
    </form>
  </Panel>;
}
