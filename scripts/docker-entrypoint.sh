#!/bin/sh
# Run pending Drizzle migrations before handing off to the main process.
# Keeps first-time deploys (and schema upgrades) hands-off — no manual
# `docker compose run app drizzle-kit migrate` needed.
set -e

if [ -d /app/drizzle ] && [ -f /app/drizzle.config.ts ]; then
  echo "[entrypoint] applying drizzle migrations…"
  node_modules/.bin/drizzle-kit migrate || {
    echo "[entrypoint] migrate failed" >&2
    exit 1
  }
else
  echo "[entrypoint] no drizzle/ directory, skipping migrations"
fi

exec "$@"
