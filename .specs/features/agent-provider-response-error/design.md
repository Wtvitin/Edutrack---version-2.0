# Agent Provider Response Error Design

**Spec**: `.specs/features/agent-provider-response-error/spec.md`
**Status**: Approved

## Boundary

```text
Orchestrator internal messages
              |
       GroqProviderAdapter
        /       |        \
 tool calls  nullable    json_object
 wire shape  list filter  + schema prompt
              |
             Groq
```

The internal contract remains normalized. Only the Groq adapter adds the wire
shape required by the external API. Gemini and OpenRouter paths retain their
existing request builders.

## Validation

The backend continues to validate Tool arguments and final structured output. The
provider mode change does not trust Groq: it only avoids a provider-side schema
rejection that occurred before the response reached backend validation.
