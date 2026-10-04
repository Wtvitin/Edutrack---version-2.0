# Validation

## Status

PASS

## Verdict

PASS

## Validation: Agent Gemini Provider - PASS

## Required evidence

- Config default resolves to `google-gemini` (`server/agent-config.mjs:24`, `tests/agent-config.test.mjs:7`).
- Gemini request uses server-only header and no key in URL (`server/agent-provider.mjs:152`, `tests/agent-provider.test.mjs:53`).
- Gemini function call maps to allowlisted Tool flow (`server/agent-provider.mjs:103`, `tests/agent-provider.test.mjs:53`).
- Gemini failure does not invoke OpenRouter (`tests/agent-provider.test.mjs:71`).
- Tool audit stores `provider=google-gemini` (`server/agent-orchestrator.mjs:144`, `tests/agent-orchestrator.test.mjs:37-43`).
- Existing Agent security and regression tests pass (`tests/agent-api.test.mjs`, `tests/agent-tools.test.mjs`).

## Gate Results

- `npm test`: `38 passed, 0 failed`.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- Targeted Agent ESLint: `0 errors, 0 warnings`.
- Full lint: pre-existing baseline only (`5 errors`, `24 warnings`).
- OpenSpec strict: `2 passed, 0 failed`.
- Authenticated smoke: `/api/health=200`, `/agente=200`, unauthenticated Agent API=`401`, verified account chat=`503 provider-not-configured` without `GOOGLE_API_KEY`.
- Real Gemini E2E: DEFERRED because `GOOGLE_API_KEY` is not configured.
