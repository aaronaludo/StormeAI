# Figma Setup

StormeAI can connect to Figma through a personal access token and file key. This allows development agents to inspect design files and help translate designs into React components.

## Environment variables

Add these to `.env`:

```env
FIGMA_ACCESS_TOKEN=
FIGMA_FILE_KEY=
FIGMA_TEAM_ID=
FIGMA_PROJECT_ID=
```

Only `FIGMA_ACCESS_TOKEN` and `FIGMA_FILE_KEY` are required for most design inspection workflows.

## Where to get the Figma access token

```txt
Figma → Account Settings → Personal access tokens
```

Create a token named something like:

```txt
StormeAI MCP Dev
```

Keep it private. Do not commit it.

## Where to get the Figma file key

Open a Figma file. The URL looks like:

```txt
https://www.figma.com/design/FILE_KEY/File-Name
```

The `FILE_KEY` part goes into:

```env
FIGMA_FILE_KEY=
```

## MCP connection

The MCP template includes a `figma` server entry using `figma-developer-mcp`.

Template path:

```txt
infra/mcp/mcp.example.json
```

Before using it, make sure your MCP client supports environment variable substitution or create a local config:

```bash
cp infra/mcp/mcp.example.json infra/mcp/mcp.local.json
```

Then provide real values through your MCP client or local environment.

## Recommended Figma workflow

1. Create the StormeAI design system file.
2. Add the file key to `.env`.
3. Design the first 5 frames from `docs/DESIGN_DIRECTION.md`.
4. Use MCP/API inspection to map frames to React components.
5. Build components in the frontend.

## Safety

- Do not put Figma tokens in frontend code.
- Do not commit `.env`.
- Use least-privilege tokens when possible.
