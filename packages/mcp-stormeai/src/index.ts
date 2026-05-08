import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "stormeai-integrations",
  version: "0.1.0",
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

async function parseResponse(response: Response) {
  const body = await response.text();
  let parsed: unknown = body;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
  }

  return parsed;
}

server.tool(
  "resend_send_email",
  "Send an email through Resend. Defaults to dry-run so agents do not accidentally email real people.",
  {
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().optional(),
    dryRun: z.boolean().default(true),
  },
  async ({ to, subject, html, text: plainText, dryRun }) => {
    const from = process.env.RESEND_FROM_EMAIL || "StormeAI <no-reply@stormeai.local>";
    const payload = { from, to, subject, html, text: plainText };

    if (dryRun) return text({ dryRun: true, provider: "resend", payload });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return text(await parseResponse(response));
  },
);

server.tool(
  "trello_create_card",
  "Create a Trello card in the configured board/list.",
  {
    name: z.string().min(1),
    description: z.string().default(""),
    listId: z.string().optional(),
  },
  async ({ name, description, listId }) => {
    const key = requiredEnv("TRELLO_API_KEY");
    const token = requiredEnv("TRELLO_TOKEN");
    let idList = listId;

    if (!idList) {
      const boardId = requiredEnv("TRELLO_BOARD_ID");
      const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?fields=name&key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`);
      const lists = (await parseResponse(listsResponse)) as Array<{ id: string; name: string }>;
      idList = lists.find((list) => ["todo", "backlog"].includes(list.name.toLowerCase()))?.id || lists[0]?.id;
    }

    if (!idList) throw new Error("No Trello listId provided or found on TRELLO_BOARD_ID.");

    const body = new URLSearchParams({ idList, name, desc: description });
    const response = await fetch(`https://api.trello.com/1/cards?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, {
      method: "POST",
      body,
    });

    return text(await parseResponse(response));
  },
);

server.tool(
  "trello_list_cards",
  "List Trello cards for the configured board.",
  {
    limit: z.number().int().min(1).max(100).default(25),
  },
  async ({ limit }) => {
    const key = requiredEnv("TRELLO_API_KEY");
    const token = requiredEnv("TRELLO_TOKEN");
    const boardId = requiredEnv("TRELLO_BOARD_ID");
    const response = await fetch(`https://api.trello.com/1/boards/${boardId}/cards?fields=name,url,idList&key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`);
    const cards = (await parseResponse(response)) as unknown[];
    return text(cards.slice(0, limit));
  },
);

server.tool(
  "paddle_list_products",
  "List Paddle products. Uses sandbox when PADDLE_ENV=sandbox.",
  {
    limit: z.number().int().min(1).max(100).default(20),
  },
  async ({ limit }) => {
    const baseUrl = process.env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
    const response = await fetch(`${baseUrl}/products?per_page=${limit}`, {
      headers: { Authorization: `Bearer ${requiredEnv("PADDLE_API_KEY")}` },
    });
    return text(await parseResponse(response));
  },
);

server.tool(
  "paddle_list_prices",
  "List Paddle prices. Uses sandbox when PADDLE_ENV=sandbox.",
  {
    productId: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(20),
  },
  async ({ productId, limit }) => {
    const baseUrl = process.env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
    const params = new URLSearchParams({ per_page: String(limit) });
    if (productId) params.set("product_id", productId);
    const response = await fetch(`${baseUrl}/prices?${params}`, {
      headers: { Authorization: `Bearer ${requiredEnv("PADDLE_API_KEY")}` },
    });
    return text(await parseResponse(response));
  },
);

server.tool(
  "n8n_trigger_webhook",
  "Trigger an n8n webhook under N8N_WEBHOOK_BASE_URL.",
  {
    path: z.string().min(1).describe("Webhook path, for example clinic-intake or /clinic-intake"),
    payload: z.record(z.string(), z.unknown()).default({}),
    method: z.enum(["POST", "GET"]).default("POST"),
  },
  async ({ path, payload, method }) => {
    const baseUrl = requiredEnv("N8N_WEBHOOK_BASE_URL").replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    const url = `${baseUrl}/${cleanPath}`;
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(payload) : undefined,
    });
    return text(await parseResponse(response));
  },
);

server.tool(
  "supabase_invoke_function",
  "Invoke a Supabase Edge Function with the service role key. Use only for development/admin operations.",
  {
    functionName: z.string().min(1),
    payload: z.record(z.string(), z.unknown()).default({}),
  },
  async ({ functionName, payload }) => {
    const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return text(await parseResponse(response));
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
