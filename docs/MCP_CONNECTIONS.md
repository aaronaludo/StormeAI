# MCP Connections

StormeAI uses MCP to let development agents safely reach external tools during development.

## Connection strategy

Use official/community MCP servers where they exist:

- GitHub: official GitHub MCP server
- Supabase: Supabase MCP server
- n8n: n8n MCP server if available for your n8n version
- Figma: Figma MCP server for inspecting design files and components

Use the local StormeAI MCP bridge for app-specific integration helpers:

- Resend email
- Trello cards
- Paddle products/prices
- n8n webhook triggering
- Supabase Edge Function invocation

Use Figma MCP/API for design-to-frontend work:

- inspect frames
- read component names
- map design tokens
- translate Figma layouts into React components

## Config template

Copy:

```bash
cp infra/mcp/mcp.example.json infra/mcp/mcp.local.json
```

Then replace env placeholders or configure your MCP client to pass env vars.

## Safety notes

- Keep destructive tools disabled unless needed.
- Use Paddle sandbox during development.
- Use test recipients for Resend.
- Do not expose Supabase service role keys to frontend code.
- Prefer read-only Supabase MCP mode unless doing schema migrations.
