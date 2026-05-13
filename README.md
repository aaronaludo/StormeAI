# StormeAI

StormeAI is a **chat-only AI agent SaaS for organizations**.

It helps organizations answer patient questions, collect appointment details, schedule appointments, and route complex cases to staff through chat — without acting as a doctor or diagnosis tool.

## Stack

- Frontend: React + TypeScript + Vite
- Database/Auth/Backend: Supabase Postgres, Auth, Edge Functions
- Vector DB/RAG: Supabase pgvector
- AI: Ollama `qwen2.5:7b` by default, optional OpenAI/Claude
- Automation: built-in chat, appointment, and handoff flows
- Email: Resend
- Billing: fixed manual billing at ₱10,000/month with unlimited chats
- Project/task ops: Trello + GitHub

## Development Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill in credentials for the services you want to use.

3. Install dependencies:

```bash
npm install
```

4. Build the MCP bridge:

```bash
npm run mcp:build
```

5. Connect your MCP client using `infra/mcp/mcp.example.json`.

See:

- `docs/OVERVIEW.md`
- `docs/MCP_CONNECTIONS.md`
- `docs/DEVELOPMENT_SETUP.md`
# StormeAI
