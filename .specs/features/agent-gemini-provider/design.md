# Design

## Runtime flow

`AgentView` → `POST /api/ai/chat` → session auth → `readAgentConfig` → `createAgentProvider` → `completeGemini` → Google `generateContent` → validated Tool Registry/Structured Output.

## Decisions

- `GOOGLE_API_KEY` remains the single Gemini credential name already used by TARGET documentation.
- `gemini-2.5-flash` is the configurable default model.
- OpenRouter remains explicit compatibility only; no Gemini failure path calls it.
- Existing `fetch` transport is retained; no SDK dependency is required.
- `ai_tool_executions.provider` is additive and nullable for old records.

## Risks and controls

- Invalid model/key: public `503`/provider error, no credential disclosure.
- Gemini schema mismatch: backend Structured Output validation remains authoritative.
- Tool call injection/IDOR: existing strict registry, session identity and ownership checks remain unchanged.
