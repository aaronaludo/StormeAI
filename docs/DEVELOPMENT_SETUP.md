# Development Setup

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project
- Ollama running locally with `qwen2.5:7b`
- Resend API key
- Trello API key/token
- GitHub token or `gh auth login`

## Local AI

```bash
ollama pull qwen2.5:7b
ollama serve
```

Set:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

## Environment

```bash
cp .env.example .env
```

Never commit `.env`.

## MCP bridge

The local MCP bridge is in `packages/mcp-stormeai`.

```bash
npm install
npm run mcp:build
npm run mcp:start
```

Use `infra/mcp/mcp.example.json` as the starting MCP client config.
