# syntax=docker/dockerfile:1.7

# ---------- 1. Dependencies (cached) ----------
FROM node:24-slim AS deps
WORKDIR /app

# better-sqlite3 native build needs python + build tools when no prebuilt
# binary matches the runtime. node:24-slim is missing make/g++/python, but
# prebuild-install grabs a precompiled binary for linux-x64 so the install
# generally finishes without touching gcc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- 2. Builder ----------
FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- 3. Runtime ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/voicenotes.db \
    AUDIO_DIR=/data/audio \
    PYTHON_BIN=/opt/whisper-venv/bin/python

# Runtime deps: ffmpeg for whisper, python venv for faster-whisper, tini for PID 1
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates ffmpeg python3 python3-venv python3-pip tini \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/whisper-venv \
  && /opt/whisper-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/whisper-venv/bin/pip install --no-cache-dir faster-whisper

RUN groupadd --gid 1001 voicenotes \
  && useradd --uid 1001 --gid 1001 --shell /bin/bash --create-home voicenotes \
  && mkdir -p /data/audio \
  && chown -R voicenotes:voicenotes /data

# Standalone Next.js output (includes only the deps it needs)
COPY --from=builder --chown=voicenotes:voicenotes /app/.next/standalone ./
COPY --from=builder --chown=voicenotes:voicenotes /app/.next/static ./.next/static
COPY --from=builder --chown=voicenotes:voicenotes /app/public ./public

# Worker is run via tsx + the full repo for its source. Keep node_modules from
# the deps stage (which also has tsx and better-sqlite3).
COPY --from=deps    --chown=voicenotes:voicenotes /app/node_modules ./node_modules
COPY --from=builder --chown=voicenotes:voicenotes /app/src ./src
COPY --from=builder --chown=voicenotes:voicenotes /app/scripts ./scripts
COPY --from=builder --chown=voicenotes:voicenotes /app/drizzle ./drizzle
COPY --from=builder --chown=voicenotes:voicenotes /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=voicenotes:voicenotes /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=voicenotes:voicenotes /app/package.json ./package.json

USER voicenotes
EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
