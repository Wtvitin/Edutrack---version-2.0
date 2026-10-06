# Tasks

### T1: Runtime startup

**Depends on**: None
**Tests**: `tests/agent-runtime.test.mjs`
**Gate**: `npm test`

- [x] Enable `--use-system-ca` for `dev` and `start` scripts.
- [x] Align the minimum Node engine and README fallback command.
- [x] Add a regression test that rejects TLS-disabling flags.

### T2: Provider diagnostics

**Depends on**: T1
**Tests**: `tests/agent-provider.test.mjs`
**Gate**: `npm test`

- [x] Retain upstream HTTP status on provider errors.
- [x] Preserve existing public provider status mapping.

### T3: API safe logging

**Depends on**: T2
**Tests**: `tests/agent-api.test.mjs`
**Gate**: `npm test`

- [x] Log only safe provider diagnostics.
- [x] Prove that configured credentials and user prompts do not enter the log.

### T4: Verification

**Depends on**: T3
**Tests**: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, OpenSpec and TLC validators
**Gate**: full

- [x] Run repository gates and targeted lint.
- [x] Run direct Gemini smoke with and without system CA.
- [x] Record limitations and evidence in `validation.md`.

## Test Coverage Matrix

| Requirement | Test | Gate |
| --- | --- | --- |
| RUNTIME-CA-01 | `tests/agent-runtime.test.mjs` | `npm test` |
| RUNTIME-CA-02 | `tests/agent-api.test.mjs` | `npm test` |
| RUNTIME-CA-03 | `tests/agent-config.test.mjs`, `tests/agent-provider.test.mjs` | `npm test` |
| RUNTIME-CA-04 | `tests/agent-provider.test.mjs` | `npm test` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Unit/integration | `npm test` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Targeted lint | `node_modules/.bin/eslint.cmd server/api.mjs server/agent-provider.mjs tests/agent-api.test.mjs tests/agent-provider.test.mjs tests/agent-runtime.test.mjs` |
| OpenSpec | `openspec validate --all --strict` |
| TLC spec | `validate_spec.py` |
| TLC tasks | `validate_tasks.py` |
| TLC state | `validate_state.py` |

## Execution Plan

```text
T1 → T2 → T3 → T4
```

## Task Breakdown

#### Runtime startup

**Done when**: both server scripts use `--use-system-ca`, the Node engine is compatible, and `tests/agent-runtime.test.mjs` passes.

#### Provider diagnostics

**Done when**: provider errors retain upstream status without changing the safe public mapping.

#### API safe logging

**Done when**: the API emits provider/model/status/code and never emits the key or prompt in the diagnostic log.

#### Verification

**Done when**: all available gates are run, the direct smoke proves the CA difference, and limitations are recorded.
