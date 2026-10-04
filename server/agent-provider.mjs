import { AgentError } from './agent-config.mjs';

export class AgentProviderError extends AgentError {
  constructor(message, status = 503, code = 'provider-unavailable', transient = false, cause) {
    super(message, status, code, cause);
    this.name = 'AgentProviderError';
    this.transient = transient;
  }
}

export function createFetchTransport(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new AgentProviderError('Provider indisponível.', 503, 'provider-transport');
  return {
    async post(url, headers, body, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
        const text = await response.text();
        let parsed = null;
        if (text) {
          try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
        }
        return { status: response.status, body: parsed };
      } catch (error) {
        if (error?.name === 'AbortError') throw new AgentProviderError('O tempo da resposta do Provider expirou.', 504, 'provider-timeout', true, error);
        throw new AgentProviderError('Não foi possível acessar o Provider.', 503, 'provider-network', true, error);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function transientStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function providerTools(tools = []) {
  return tools.map(tool => tool.type === 'function' ? tool : ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
}

function geminiSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema;
  const result = {};
  for (const key of ['type', 'title', 'description', 'enum', 'format', 'minimum', 'maximum', 'minItems', 'maxItems', 'required']) {
    if (schema[key] !== undefined) result[key] = schema[key];
  }
  if (schema.const !== undefined) result.enum = [schema.const];
  if (schema.properties && typeof schema.properties === 'object') result.properties = Object.fromEntries(Object.entries(schema.properties).map(([name, value]) => [name, geminiSchema(value)]));
  if (schema.items) result.items = geminiSchema(schema.items);
  if (schema.additionalProperties !== undefined) result.additionalProperties = typeof schema.additionalProperties === 'object' ? geminiSchema(schema.additionalProperties) : schema.additionalProperties;
  if (schema.prefixItems) result.prefixItems = schema.prefixItems.map(geminiSchema);
  return result;
}

function responseFormatBody(responseFormat) {
  if (!responseFormat) return undefined;
  return { type: 'json_schema', json_schema: { name: responseFormat.name, strict: true, schema: responseFormat.schema } };
}

function parseJsonArguments(value) {
  if (typeof value !== 'string') return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return null;
  }
}

function parseOpenRouterResponse(body, model) {
  const choice = body?.choices?.[0];
  const message = choice?.message;
  if (!message) throw new AgentProviderError('Resposta vazia do Provider.', 503, 'provider-empty-response', true);
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls.map((call, index) => ({
    id: String(call?.id || `call_${index + 1}`),
    name: String(call?.function?.name || 'unknown'),
    arguments: parseJsonArguments(call?.function?.arguments),
  })) : [];
  if (message.content == null && toolCalls.length === 0) throw new AgentProviderError('Resposta vazia do Provider.', 503, 'provider-empty-response', true);
  return { content: message.content == null ? null : String(message.content), toolCalls: toolCalls.length ? toolCalls : undefined, model, usage: body?.usage, raw: body };
}

function geminiMessages(messages) {
  return messages.filter(message => message.role !== 'system').map(message => {
    if (message.role === 'user') return { role: 'user', parts: [{ text: message.content || '' }] };
    if (message.role === 'assistant') {
      const parts = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.tool_calls || []) parts.push({ functionCall: { name: call.name, args: call.arguments } });
      return { role: 'model', parts: parts.length ? parts : [{ text: '' }] };
    }
    let response;
    try { response = JSON.parse(message.content || '{}'); } catch { response = { value: message.content || '' }; }
    return { role: 'user', parts: [{ functionResponse: { name: message.name || 'tool', response } }] };
  });
}

function geminiSystemInstruction(messages) {
  const text = messages.filter(message => message.role === 'system').map(message => message.content || '').filter(Boolean).join('\n\n');
  return text ? { parts: [{ text }] } : undefined;
}

function geminiTools(tools = []) {
  const definitions = providerTools(tools).map(tool => ({ name: tool.function.name, description: tool.function.description || '', parameters: geminiSchema(tool.function.parameters) }));
  return definitions.length ? [{ functionDeclarations: definitions }] : undefined;
}

function parseGeminiResponse(body, model) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || !parts.length) throw new AgentProviderError('Resposta vazia do Provider.', 503, 'provider-empty-response', true);
  let content = '';
  const toolCalls = [];
  parts.forEach((part, index) => {
    if (typeof part?.text === 'string') content += part.text;
    if (part?.functionCall?.name) toolCalls.push({ id: `call_${Date.now()}_${index}`, name: part.functionCall.name, arguments: part.functionCall.args && typeof part.functionCall.args === 'object' ? part.functionCall.args : {} });
  });
  if (!content && !toolCalls.length) throw new AgentProviderError('Resposta vazia do Provider.', 503, 'provider-empty-response', true);
  return { content: content || null, toolCalls: toolCalls.length ? toolCalls : undefined, model, usage: body?.usageMetadata, raw: body };
}

async function completeOpenRouter(config, transport, request) {
  if (!config.apiKey) throw new AgentProviderError('O Provider do Agent não está configurado.', 503, 'provider-not-configured');
  const models = [...new Set([request.model || config.model, config.fallbackModel].filter(Boolean))];
  if (!models.length) throw new AgentProviderError('O modelo do Agent não está configurado.', 503, 'model-not-configured');
  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const body = { model, messages: request.messages, temperature: request.temperature ?? 0.2, max_tokens: request.maxTokens ?? 1600 };
      const tools = providerTools(request.tools);
      if (tools.length) { body.tools = tools; body.tool_choice = request.toolChoice || 'auto'; }
      if (request.responseFormat) body.response_format = responseFormatBody(request.responseFormat);
      try {
        const response = await transport.post(`${config.baseUrl}/chat/completions`, { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`, 'X-Title': 'EduTrack AI' }, body, config.timeoutMs);
        if (response.status < 200 || response.status >= 300) {
          const error = new AgentProviderError('O Provider não conseguiu responder.', response.status === 429 ? 429 : response.status >= 500 || response.status === 408 ? 503 : 503, 'provider-http-error', transientStatus(response.status));
          if (!error.transient) throw error;
          lastError = error;
          continue;
        }
        return parseOpenRouterResponse(response.body, model);
      } catch (error) {
        const normalized = error instanceof AgentProviderError ? error : new AgentProviderError('O Provider não conseguiu responder.', 503, 'provider-network', true, error);
        if (!normalized.transient) throw normalized;
        lastError = normalized;
      }
      if (attempt === 0) await wait(50);
    }
  }
  throw lastError || new AgentProviderError('O Provider está indisponível.', 503, 'provider-unavailable', true);
}

async function completeGemini(config, transport, request) {
  if (!config.apiKey) throw new AgentProviderError('O Provider do Agent não está configurado.', 503, 'provider-not-configured');
  const contents = geminiMessages(request.messages);
  if (request.responseFormat && !request.tools?.length) contents.unshift({ role: 'user', parts: [{ text: `Retorne somente JSON válido conforme este schema: ${JSON.stringify(request.responseFormat.schema)}` }] });
  const body = { systemInstruction: geminiSystemInstruction(request.messages), contents, tools: geminiTools(request.tools), generationConfig: { temperature: request.temperature ?? 0.2, maxOutputTokens: request.maxTokens ?? 1600, ...(request.responseFormat && !request.tools?.length ? { responseMimeType: 'application/json', responseSchema: geminiSchema(request.responseFormat.schema) } : {}) } };
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await transport.post(`${config.baseUrl}/${encodeURIComponent(request.model || config.model)}:generateContent`, { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey }, body, config.timeoutMs);
      if (response.status < 200 || response.status >= 300) {
        const error = new AgentProviderError('O Provider não conseguiu responder.', response.status === 429 ? 429 : 503, 'provider-http-error', transientStatus(response.status));
        if (!error.transient) throw error;
        lastError = error;
      } else return parseGeminiResponse(response.body, request.model || config.model);
    } catch (error) {
      const normalized = error instanceof AgentProviderError ? error : new AgentProviderError('O Provider não conseguiu responder.', 503, 'provider-network', true, error);
      if (!normalized.transient) throw normalized;
      lastError = normalized;
    }
    if (attempt === 0) await wait(50);
  }
  throw lastError || new AgentProviderError('O Provider está indisponível.', 503, 'provider-unavailable', true);
}

export function createAgentProvider(config, transport = createFetchTransport()) {
  return {
    async complete(request) {
      if (config.provider === 'google-gemini') return completeGemini(config, transport, request);
      if (config.provider === 'openrouter') return completeOpenRouter(config, transport, request);
      throw new AgentProviderError('O Provider configurado não é suportado.', 503, 'provider-not-supported');
    },
  };
}
