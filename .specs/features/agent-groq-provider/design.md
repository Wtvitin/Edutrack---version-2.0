# Agent Groq Provider Design

**Spec**: `.specs/features/agent-groq-provider/spec.md`
**Status**: Approved

## Architecture Overview

Groq is one additional implementation behind the current provider factory. No caller of `chatWithAgent` changes.

```text
AgentView -> /api/ai/chat -> AgentOrchestrator -> provider factory
                                              -> Google Gemini adapter
                                              -> GroqProviderAdapter
                                              -> OpenRouter compatibility adapter
```

## Code Reuse Analysis

| Component | Location | How to Use |
| --- | --- | --- |
| Config loader | `server/agent-config.mjs` | Add Groq normalization and server-only env selection. |
| HTTP transport | `server/agent-provider.mjs` | Reuse abort-based timeout, safe errors and injected transport. |
| OpenAI parser | `server/agent-provider.mjs` | Reuse message, Tool Call and Structured Output response parser. |
| Orchestrator | `server/agent-orchestrator.mjs` | Reuse unchanged for prompts, Tools, ownership and audit. |
| Audit table | `ai_tool_executions` | Reuse existing `provider` and `model` columns. |

## Components

### GroqProviderAdapter

- **Purpose**: Convert the internal completion request to Groq chat completions and return the existing completion result shape.
- **Location**: `server/agent-provider.mjs`
- **Interfaces**: `complete(request)` returning `{ content, toolCalls, model, usage, raw }`.
- **Dependencies**: Config, injected transport and existing OpenAI-compatible helpers.
- **Reuses**: `providerTools`, `responseFormatBody`, `parseOpenRouterResponse`, retry and error classifications.

### Groq configuration

- **Purpose**: Select Groq deterministically and keep its key/model server-side.
- **Location**: `server/agent-config.mjs`
- **Interfaces**: existing `readAgentConfig(env)` result.
- **Dependencies**: Environment only.
- **Reuses**: Existing bounded timeout parsing and provider factory contract.

## Error Handling Strategy

| Error scenario | Handling | User impact |
| --- | --- | --- |
| Missing Groq key/model | Controlled config error before network | Safe provider configuration message |
| 408, 429, 5xx, network, timeout | One retry through Groq only | Controlled availability message |
| 401, 403, 404 or malformed response | No retry and no fallback | Controlled provider error |
| Invalid Tool/result JSON | Existing backend validation rejects it | No unauthorized domain action |

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Structured Outputs strict support is model-dependent | Groq deployment configuration | Invalid provider request for unsupported model | Require `GROQ_MODEL`; document compatible model selection; retain backend validation. |
| Groq documents no Tools with Structured Outputs in the same request | Provider request boundary | Combined request can fail | Existing Orchestrator sends Tools before a final schema-only request. |

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| SDK | No new SDK | Existing HTTP abstraction already covers the required API. |
| Model default | None for Groq | Avoids silently selecting a model whose active capabilities may differ. |
| Provider fallback | None | Provider selection must remain deterministic and auditable. |
