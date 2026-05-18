# voicenotes

Family-scale PWA for recording, transcribing, and sharing voice notes.

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui
- **DB:** SQLite via Drizzle ORM (one file, no external service)
- **Auth:** Better Auth (email/password, first user becomes admin)
- **Transcription:** faster-whisper (Python subprocess, CPU-only, multilingual)
- **Background worker:** polls pending notes and runs Whisper
- **MCP server:** lets Claude Code browse and categorize notes from your editor
- **PWA:** installable, offline-aware recording UI

## Local development

```bash
npm install
cp .env.example .env.local         # then edit AUTH_SECRET, etc.
npm run db:migrate                 # creates data/voicenotes.db
npm run dev                        # http://localhost:3000
```

In a second terminal, start the worker:

```bash
# Dry-run mode (no Python required) — emits placeholder transcripts
WHISPER_DRY_RUN=1 npm run worker

# Real transcription — needs Python 3 + ffmpeg + faster-whisper installed
pip install faster-whisper
npm run worker
```

The first user to register becomes **admin** automatically. To reset, delete
`data/voicenotes.db` and re-run `npm run db:migrate`.

## Project scripts

| Command                | What                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Next.js dev server with Turbopack                                 |
| `npm run build`        | Production build (standalone, used by Docker)                     |
| `npm run start`        | Run the production build locally                                  |
| `npm run worker`       | Background transcription worker (Python subprocess)               |
| `npm run worker:dev`   | Worker with tsx watch                                             |
| `npm run mcp`          | Start the MCP stdio server                                        |
| `npm run db:generate`  | Generate a new Drizzle migration from `src/db/schema.ts`          |
| `npm run db:migrate`   | Apply pending migrations to the SQLite DB                         |
| `npm run db:push`      | Push schema changes without a migration (dev only)                |
| `npm run db:studio`    | Open Drizzle Studio                                               |

## Smoke tests

```bash
node scripts/smoke-e2e.mjs    # sign up -> upload -> patch -> share -> delete
node scripts/smoke-mcp.mjs    # spawn MCP server, list tools, call get_recent
```

## Environment variables

See [.env.example](./.env.example). The important ones:

| Var               | Default                           | Notes                                                                 |
| ----------------- | --------------------------------- | --------------------------------------------------------------------- |
| `AUTH_SECRET`     | —                                 | Required. 32+ random chars. Used by Better Auth.                      |
| `DATABASE_URL`    | `file:./data/voicenotes.db`       | SQLite path. In Docker: `file:/data/voicenotes.db`.                   |
| `NEXT_PUBLIC_URL` | `http://localhost:3000`           | Public base URL (no trailing slash). Used by auth + PWA manifest.     |
| `AUDIO_DIR`       | `./data/audio`                    | Where uploaded audio files go.                                        |
| `WHISPER_MODEL`   | `medium`                          | One of: tiny, base, small, medium, large-v3. CPU → medium recommended.|
| `WORKER_POLL_MS`  | `5000`                            | How often the worker scans for pending notes.                         |
| `WHISPER_DRY_RUN` | unset                             | If `1`, worker emits placeholder text instead of running Python.      |
| `PYTHON_BIN`      | `python`                          | Path to the Python that has faster-whisper. Docker image sets this.   |

## Deployment (Coolify on the voicenotes VM)

The VM (`voicenotes`, 192.168.0.121 / 100.120.227.4) already has Docker +
Coolify + Cloudflared running and the tunnel `notes.cugovci.uk` configured.

### Option A — Coolify dashboard

1. Open http://192.168.0.121:8000 (LAN or Tailscale).
2. New Resource → Public Repository → `https://github.com/juro139/voicenotes`.
3. Build pack: **Docker Compose** with `docker-compose.yml`.
4. Set environment variables: `AUTH_SECRET`, `NEXT_PUBLIC_URL=https://notes.cugovci.uk`, optionally override `WHISPER_MODEL`.
5. Coolify provisions Traefik routes automatically. Domain
   `notes.cugovci.uk` is already wired through the Cloudflare tunnel to
   Traefik on :80, so the site goes live once the container is healthy.
6. Run migrations on first boot:
   ```bash
   docker compose run --rm app npx drizzle-kit migrate
   ```

### Option B — Direct docker compose on the VM

```bash
ssh -i ~/.ssh/voicenotes_ed25519 juraj@192.168.0.121
git clone https://github.com/juro139/voicenotes.git
cd voicenotes
cp .env.example .env
nano .env                           # set AUTH_SECRET + NEXT_PUBLIC_URL
docker compose build
docker compose run --rm app npx drizzle-kit migrate
docker compose up -d
```

### First-time admin

The first email to register becomes the admin. Visit
`https://notes.cugovci.uk/register`, sign up, then invite family by
sharing the public URL — subsequent accounts default to role `user`.

## MCP server (Claude Code integration)

Register the MCP server in your Claude Code config (`~/.claude.json` or
project-local `.mcp.json`):

```json
{
  "mcpServers": {
    "voicenotes": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/voicenotes"
    }
  }
}
```

Tools exposed:

- `search_voicenotes(query, limit?)` — full-text across summary/transcript/category
- `get_recent(limit?)` — latest N notes
- `get_by_id(id)` — single note
- `list_pending()` — notes still waiting on transcription/categorization
- `list_all_users()` — operator info
- `categorize_voicenote(id, summary?, category?, tags?)` — manual review hook;
  sets `status='categorized'` once summary and category are present

The server reads the same SQLite file as the app (`DATABASE_URL`), so make
sure it's pointing at the right DB.

## Architecture sketch

```
Browser  ----->  Next.js (App Router, server components, REST API on /api/*)
                  |              |
                  |              +----->  SQLite  (Drizzle ORM, WAL mode)
                  |                          ^
                  v                          |
              Audio uploads               worker.ts -- spawn --> scripts/transcribe.py
              -> /data/audio                                     (faster-whisper, CPU)
```

The worker process polls the DB every 5s for `status='pending'` notes,
spawns Python for each, and writes back `rawText` + `status='transcribed'`.
Manual categorization happens via the MCP server in your editor.
