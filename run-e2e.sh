#!/bin/sh
#
# Runs the Playwright end-to-end suite against the RUNNING containers.
#
# Playwright needs a browser, and installing Chromium and its libraries onto
# Amazon Linux is a long detour. The official Playwright image already has
# them, so the suite runs in a container instead - nothing to install on the
# host beyond Docker, which is already there.
#
# Three details matter:
#
#   --network host      the tests address localhost:80 and localhost:4080,
#                       which are the HOST's ports, not the container's
#   --user $(id -u)...  without it the container writes as root, and every
#                       file it creates becomes undeletable and breaks the
#                       next git pull
#   REPO resolution     the script finds its own directory, so it works from
#                       anywhere; running it from the wrong folder would
#                       silently mount an empty directory and report
#                       "No tests found"
#
# Usage:
#   ./run-e2e.sh                       run everything
#   ./run-e2e.sh --list                list without running
#   ./run-e2e.sh server-crud.spec.ts   run one file
#
# Override the targets for a different deployment:
#   WEB_BASE_URL=http://localhost:3000 ./run-e2e.sh

set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

IMAGE="mcr.microsoft.com/playwright:v1.62.0-noble"
WEB="${WEB_BASE_URL:-http://localhost}"
API="${API_BASE_URL:-http://localhost:4080}"

echo "repo : $REPO"
echo "web  : $WEB"
echo "api  : $API"
echo

# Fail early with a clear message rather than a confusing test failure.
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: cannot reach the Docker daemon."
  echo
  echo "Group membership applies per shell. Either activate it here:"
  echo "    newgrp docker"
  echo "or reconnect your session, which fixes it for good."
  exit 1
fi

if ! curl -sf -o /dev/null "$API/health"; then
  echo "ERROR: no RSS Server at $API/health"
  echo "The suite tests a running deployment. Start it with:"
  echo "  docker compose up -d"
  exit 1
fi

exec docker run --rm --network host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e WEB_BASE_URL="$WEB" \
  -e API_BASE_URL="$API" \
  -v "$REPO/frontend:/work" \
  -w /work \
  "$IMAGE" \
  npx playwright test --workers=1 "$@"
