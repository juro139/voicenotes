// Sanity check: spawn the MCP server, send `initialize` + `tools/list` over
// stdio, verify we get back a valid response with our tools.
import { spawn } from "node:child_process";

const proc = spawn("npx", ["tsx", "src/mcp/server.ts"], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
});

let buf = "";
const pending = new Map();
let nextId = 1;

proc.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      // ignore
    }
  }
});
proc.stderr.on("data", (c) => process.stderr.write(c));

function rpc(method, params) {
  const id = nextId++;
  const msg = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify(msg) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`rpc ${method} timed out`));
      }
    }, 5000);
  });
}

try {
  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0.0.1" },
  });
  if (init.error) throw new Error(`initialize: ${JSON.stringify(init.error)}`);
  console.log("• initialized:", init.result.serverInfo);

  // Send the notifications/initialized notification (no reply expected)
  proc.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );

  const list = await rpc("tools/list", {});
  if (list.error) throw new Error(`tools/list: ${JSON.stringify(list.error)}`);
  console.log(
    `• ${list.result.tools.length} tools:`,
    list.result.tools.map((t) => t.name).join(", "),
  );

  const expected = [
    "search_voicenotes",
    "get_recent",
    "get_by_id",
    "list_pending",
    "list_all_users",
    "categorize_voicenote",
  ];
  const got = new Set(list.result.tools.map((t) => t.name));
  const missing = expected.filter((n) => !got.has(n));
  if (missing.length > 0) {
    throw new Error(`missing tools: ${missing.join(", ")}`);
  }

  const recent = await rpc("tools/call", {
    name: "get_recent",
    arguments: { limit: 3 },
  });
  if (recent.error) throw new Error(`get_recent: ${JSON.stringify(recent.error)}`);
  const text = recent.result.content[0].text;
  const parsed = JSON.parse(text);
  console.log(`• get_recent returned ${parsed.count} notes`);

  console.log("\n✓ MCP smoke passed");
  proc.kill();
  process.exit(0);
} catch (err) {
  console.error("✗ MCP smoke failed:", err.message);
  proc.kill();
  process.exit(1);
}
