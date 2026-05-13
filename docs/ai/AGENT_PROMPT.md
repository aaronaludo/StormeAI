# Chat-only AI Agent Prompt

The prompt module defines StormeAI's safe agent behavior.

## Rules

- Chat-only agent
- No diagnosis
- No prescriptions
- No treatment recommendations
- Emergency messages route to urgent-care guidance
- Organization-specific questions should use approved RAG context
- Appointment details are collected one question at a time

## Main function

`buildAgentSystemPrompt(config, context)`

It combines:

- organization identity
- agent personality
- language style
- safety rules
- appointment behavior
- retrieved RAG snippets
