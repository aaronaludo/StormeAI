# StormeAI

StormeAI is a **chat-only AI receptionist SaaS for clinics**.

It helps clinics answer patient questions, collect appointment details, schedule appointments, trigger workflows, and route complex cases to staff through chat — without acting as a doctor or diagnosis tool.

## Stack

- Frontend: React + TypeScript + Tailwind + shadcn/ui + React Flow
- Database/Auth/Backend: Supabase Postgres, Auth, Edge Functions
- Vector DB/RAG: Supabase pgvector
- AI: Ollama `qwen2.5:7b` by default, optional OpenAI/Claude
- Workflow: n8n webhooks
- Email: Resend
- Billing: Paddle
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
