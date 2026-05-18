/**
 * voicenotes MCP server (stdio).
 *
 * Exposes read-only tools for browsing and categorizing voice notes from
 * Claude Code. Designed to run locally against the same SQLite DB the Next.js
 * app uses. No auth — the user running this process is assumed to be the
 * owner. Run via `npm run mcp`.
 */
import { config as loadEnv } from "dotenv";
// quiet: dotenv prints "tip" lines to stdout by default; for an MCP stdio
// server that pollutes the JSON-RPC stream and breaks clients.
loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { desc, eq, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";

type NoteRow = typeof schema.voicenote.$inferSelect;

function serializeNote(row: NoteRow) {
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    audioPath: row.audioPath,
    durationSeconds: row.durationSeconds,
    language: row.language,
    rawText: row.rawText,
    summary: row.summary,
    category: row.category,
    tags: row.tags,
    shared: row.shared,
    status: row.status,
  };
}

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "voicenotes",
  version: "0.1.0",
});

server.registerTool(
  "search_voicenotes",
  {
    description:
      "Full-text search across voice notes (summary, transcript, category). Returns up to `limit` newest matches.",
    inputSchema: {
      query: z.string().min(1).max(200).describe("Search term"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Max results (default 10)"),
    },
  },
  async ({ query, limit }) => {
    const q = `%${query}%`;
    const rows = db
      .select()
      .from(schema.voicenote)
      .where(
        or(
          like(schema.voicenote.summary, q),
          like(schema.voicenote.rawText, q),
          like(schema.voicenote.category, q),
        ),
      )
      .orderBy(desc(schema.voicenote.createdAt))
      .limit(limit ?? 10)
      .all();
    return textResult({
      count: rows.length,
      notes: rows.map(serializeNote),
    });
  },
);

server.registerTool(
  "get_recent",
  {
    description: "Get the N most recently created voice notes.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("How many notes (default 10)"),
    },
  },
  async ({ limit }) => {
    const rows = db
      .select()
      .from(schema.voicenote)
      .orderBy(desc(schema.voicenote.createdAt))
      .limit(limit ?? 10)
      .all();
    return textResult({ count: rows.length, notes: rows.map(serializeNote) });
  },
);

server.registerTool(
  "get_by_id",
  {
    description: "Fetch a single voice note by id.",
    inputSchema: {
      id: z.string().describe("voicenote.id (uuid)"),
    },
  },
  async ({ id }) => {
    const rows = db
      .select()
      .from(schema.voicenote)
      .where(eq(schema.voicenote.id, id))
      .limit(1)
      .all();
    if (rows.length === 0) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `No note with id ${id}` }],
      };
    }
    return textResult(serializeNote(rows[0]));
  },
);

server.registerTool(
  "list_pending",
  {
    description:
      "List voice notes that still need transcription or categorization (status != 'categorized').",
    inputSchema: {},
  },
  async () => {
    const pending = db
      .select()
      .from(schema.voicenote)
      .where(eq(schema.voicenote.status, "pending"))
      .orderBy(desc(schema.voicenote.createdAt))
      .all();
    const transcribed = db
      .select()
      .from(schema.voicenote)
      .where(eq(schema.voicenote.status, "transcribed"))
      .orderBy(desc(schema.voicenote.createdAt))
      .all();
    return textResult({
      pending: pending.map(serializeNote),
      transcribed_awaiting_category: transcribed.map(serializeNote),
    });
  },
);

server.registerTool(
  "list_all_users",
  {
    description: "List all registered users (admin/operator info).",
    inputSchema: {},
  },
  async () => {
    const rows = db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        role: schema.user.role,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .all();
    return textResult({
      count: rows.length,
      users: rows.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  },
);

server.registerTool(
  "categorize_voicenote",
  {
    description:
      "Update a note's summary, category, tags after manual review. Marks status='categorized' when summary and category are set.",
    inputSchema: {
      id: z.string().describe("voicenote.id"),
      summary: z.string().max(500).optional(),
      category: z.string().max(80).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
    },
  },
  async ({ id, summary, category, tags }) => {
    const existing = db
      .select()
      .from(schema.voicenote)
      .where(eq(schema.voicenote.id, id))
      .limit(1)
      .all();
    if (existing.length === 0) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `No note with id ${id}` }],
      };
    }
    const patch: Partial<NoteRow> = {};
    if (summary !== undefined) patch.summary = summary;
    if (category !== undefined) patch.category = category;
    if (tags !== undefined) patch.tags = tags;
    const after = { ...existing[0], ...patch };
    if (after.summary && after.category) {
      patch.status = "categorized";
    }
    db.update(schema.voicenote)
      .set(patch)
      .where(eq(schema.voicenote.id, id))
      .run();
    return textResult({ ok: true, note: serializeNote(after as NoteRow) });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[mcp] fatal:", err);
  process.exit(1);
});
