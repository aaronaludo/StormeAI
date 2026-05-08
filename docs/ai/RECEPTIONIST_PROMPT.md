# Chat-only AI Receptionist Prompt

The prompt module defines StormeAI's safe receptionist behavior.

## Rules

- Chat-only receptionist
- No diagnosis
- No prescriptions
- No treatment recommendations
- Emergency messages route to urgent-care guidance
- Clinic-specific questions should use approved RAG context
- Appointment details are collected one question at a time

## Main function

`buildReceptionistSystemPrompt(config, context)`

It combines:

- clinic identity
- receptionist personality
- language style
- safety rules
- appointment behavior
- retrieved RAG snippets
