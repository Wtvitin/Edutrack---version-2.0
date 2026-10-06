# Validation: Gemini Provider Runtime CA - PASS

## Status

PASS

## Verdict

PASS WITH LIMITATIONS

## Validation: Gemini Provider Runtime CA

### Root cause evidence

- Before the runtime fix, the direct Gemini call returned `provider-network` with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when Node used its bundled CA store.
- With `node --use-system-ca`, the same server-side adapter returned `OK` using provider `google-gemini` and model `gemini-2.5-flash`.
- The first authenticated request with Tools then exposed a second adapter defect: Gemini returned HTTP 400 for unsupported `additionalProperties` and nullable JSON Schema arrays in function declarations.
- Structured Output exposed a third adapter defect: Gemini rejected `additionalProperties` and the constraint-heavy response schema with HTTP 400.

### Acceptance evidence

- `package.json:12` and `package.json:14` enable `--use-system-ca` without disabling TLS.
- `server/agent-provider.mjs:47` normalizes Gemini schemas for Tools and Structured Output.
- `server/agent-provider.mjs:144` and `server/agent-provider.mjs:172` retain upstream HTTP status.
- `server/api.mjs:16` and `server/api.mjs:120` emit safe provider diagnostics only.
- `tests/agent-runtime.test.mjs:7` protects startup flags and TLS behavior.
- `tests/agent-provider.test.mjs:67` and `tests/agent-provider.test.mjs:87` cover Tool and Structured Output schema mapping.
- `tests/agent-api.test.mjs:89` verifies that provider logs do not contain credentials or prompts.

### Gate Results

- `npm.cmd test`: PASS, `44 passed, 0 failed`.
- `npm.cmd run typecheck`: PASS.
- Targeted ESLint for changed Agent/runtime files: PASS, `0 errors, 0 warnings`.
- `npm.cmd run build`: PASS.
- Full `npm.cmd run lint`: repository baseline remains `5 errors, 24 warnings` in unrelated pre-existing files; no changed Agent/runtime file is reported.
- `openspec validate --all --strict`: PASS, `3 passed, 0 failed`.
- TLC `validate_spec.py`: PASS.
- TLC `validate_tasks.py`: PASS.

### Runtime and E2E evidence

- Local server is running from `npm.cmd run dev`, which now starts `node --use-system-ca server/start.mjs --dev`.
- Direct Gemini simple response: PASS, returned `OK`.
- Direct Gemini Tool Calling request: PASS, real Gemini returned `list_tasks` and the follow-up Structured Output response was accepted.
- Authenticated local HTTP flow: registration, local mailbox, verification, login and `/api/ai/chat` simple message all returned success.
- Authenticated `/api/ai/chat` Tool flow for `Quais são minhas tarefas?`: PASS, HTTP 200, analysis response and one Tool Call.
- Authenticated `/api/ai/chat` performance request: provider reached successfully but Gemini returned HTTP 429 after the preceding live calls. This is a quota/rate-limit limitation, not an authentication or schema failure.

### Security

- `GOOGLE_API_KEY` remains server-side and is sent through `x-goog-api-key`.
- The key is not placed in the URL, frontend, reports or logs.
- TLS verification remains enabled; no insecure TLS flag or OpenRouter fallback was added.
- Existing session, ownership, Tool Registry, validation and audit paths remain unchanged.

### Overall

The implementation is ready for local Gemini use. A fresh live test of the performance prompt should be repeated after the provider quota/rate limit resets.
