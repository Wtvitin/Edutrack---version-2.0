export type ChartSpecification = {
  type: string;
  title: string;
  description?: string;
  xAxis: { field: string; label: string };
  yAxis: { field: string; label: string };
  series: Array<{ field: string; label: string }>;
  data: Array<Record<string, unknown>>;
  source: { tool: string };
  datasetVersion: string;
};

export type AgentResponse =
  | { type: 'text'; content: string; metadata?: Record<string, unknown> }
  | { type: 'analysis'; analysis: string; metrics: Record<string, unknown>; chart?: ChartSpecification; metadata?: Record<string, unknown> }
  | { type: 'action'; action: 'create_task' | 'update_task' | 'complete_task'; result: Record<string, unknown>; metadata?: Record<string, unknown> };

export type AgentChatResult = { conversationId: string; response: AgentResponse; metadata?: { model?: string; iterations?: number; toolCalls?: number } };

export async function chatWithAgent(input: { message: string; conversationId?: string }): Promise<AgentChatResult> {
  const response = await fetch('/api/ai/chat', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const result = await response.json() as AgentChatResult & { message?: string };
  if (!response.ok) throw new Error(result.message || 'Não foi possível falar com o Agent.');
  return result;
}
