"use client";
import { FormEvent, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Send, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { formatMinutes, lastSevenDays, type StudyData } from '@/lib/edutrack';
import { AgentChart } from './agent-chart';
import { chatWithAgent, type AgentResponse } from './agent-api';
import { Heading, type ViewProps } from './views';

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; response?: AgentResponse };

function responseText(response: AgentResponse) {
  if (response.type === 'text') return response.content;
  if (response.type === 'analysis') return response.analysis;
  return `Ação ${response.action.replaceAll('_', ' ')} concluída.`;
}

function demoResponse(message: string, data: StudyData): AgentResponse {
  const pending = data.tasks.filter(task => !task.done);
  if (/tarefa|pendência/i.test(message)) return { type: 'text', content: `Você tem ${pending.length} tarefas pendentes. A próxima é ${pending[0]?.title || 'planejar um novo passo'}.` };
  return { type: 'text', content: `Nos últimos 7 dias você estudou ${formatMinutes(lastSevenDays(data.sessions).reduce((sum, day) => sum + day.minutes, 0))}. O Agent real exige uma conta autenticada.` };
}

export function AgentView({ data, editTask }: Pick<ViewProps, 'data' | 'editTask'>) {
  const isDemo = !data.profile.id;
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setError('');
    setMessages(previous => [...previous, { id: `${Date.now()}-user`, role: 'user', text: message }]);
    if (isDemo) {
      setMessages(previous => [...previous, { id: `${Date.now()}-assistant`, role: 'assistant', text: responseText(demoResponse(message, data)), response: demoResponse(message, data) }]);
      return;
    }
    setBusy(true);
    try {
      const result = await chatWithAgent({ message, conversationId });
      setConversationId(result.conversationId);
      setMessages(previous => [...previous, { id: `${Date.now()}-assistant`, role: 'assistant', text: responseText(result.response), response: result.response }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a conversa.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Heading title="Um novo olhar para seus estudos" description={isDemo ? 'Explore a demonstração offline. O Agent real usa sua conta e o backend autorizado.' : 'Converse com seu assistente acadêmico sem sair do seu espaço.'}/>
    <div className="agent-workspace">
      <div className="agent-orb"><Sparkles size={34}/></div>
      <span className="pill purple">{isDemo ? 'DEMONSTRAÇÃO · SEM ENVIO DE DADOS' : 'AGENTE CONECTADO · BACKEND SEGURO'}</span>
      <h2>Mais clareza para<br/>dar o próximo passo.</h2>
      <p>O Agent consulta suas próprias tarefas e métricas, valida ações no servidor e mantém o histórico auditável.</p>
      <div className="agent-suggestions"><button className="button secondary" onClick={() => setInput('Quais são minhas tarefas?')}><CalendarDays size={17}/>Ver minhas tarefas</button><button className="button secondary" onClick={() => setInput('Como está meu progresso?')}><Target size={17}/>Entender meu progresso</button></div>
      <section className="panel agent-preview">
        <div className="insight-label"><Sparkles size={18}/>Conversa com o Agent</div>
        {!messages.length && <p className="form-note">{isDemo ? 'Este modo usa apenas os dados locais desta demonstração.' : 'Pergunte sobre suas tarefas, estudos ou progresso.'}</p>}
        <div className="agent-messages" role="log" aria-live="polite">{messages.map(message => <article key={message.id} className={`agent-message ${message.role}`}><strong>{message.role === 'user' ? 'Você' : 'EduTrack Agent'}</strong><p>{message.text}</p>{message.response?.type === 'analysis' && message.response.chart && <AgentChart chart={message.response.chart}/>} {message.response?.type === 'analysis' && <small>{Object.entries(message.response.metrics).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</small>}</article>)}</div>
        {busy && <p className="form-note" role="status">O Agent está pensando…</p>}
        {error && <p className="form-feedback error" role="alert">{error}</p>}
        <form onSubmit={submit} className="agent-chat-form"><textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Ex.: Crie uma tarefa para estudar Python amanhã" maxLength={12000} rows={3} aria-label="Mensagem para o Agent"/><div className="inline-actions"><span className="form-note"><ShieldCheck size={15}/>Ações passam por validação do backend.</span><button className="button primary" type="submit" disabled={!input.trim() || busy}>{busy ? 'Enviando…' : 'Enviar'}<Send size={16}/></button></div></form>
        {isDemo && <button className="button secondary" onClick={() => editTask()}>Planejar uma tarefa manualmente<ArrowRight size={17}/></button>}
      </section>
      <div className="agent-principles"><span><ShieldCheck size={17}/>Ações autorizadas</span><span><Clock3 size={17}/>Histórico auditável no backend</span></div>
    </div>
  </>;
}
