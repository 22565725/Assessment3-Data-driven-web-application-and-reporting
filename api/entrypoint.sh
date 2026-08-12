#!/bin/sh
set -e

# Workshop 7 Part 2 needed wait-for-it.sh here because Postgres is a separate
# container that takes time to accept connections. SQLite is a file on a
# mounted volume, so there is nothing to wait for.

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] seeding database (idempotent)..."
node prisma/seed.mjs || echo "[entrypoint] seed skipped"

echo "[entrypoint] starting RSS Server on port 3000..."
exec npm start
