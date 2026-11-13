#!/usr/bin/env bash
# Local setup for a fresh clone: checks prerequisites and creates .env. Safe to re-run.
# Usage: pnpm setup:dev   (or: bash scripts/setup.sh)
# Development only. Production gets env vars from the platform's secret store.
set -euo pipefail

cd "$(dirname "$0")/.."

fail() { printf 'Error: %s\n' "$1" >&2; exit 1; }

echo "==> Checking prerequisites"
command -v node >/dev/null || fail "Node.js is not installed (see \"engines\" in package.json)."
command -v pnpm >/dev/null || fail "pnpm is not installed. Run: corepack enable"
command -v docker >/dev/null || fail "Docker is not installed."
docker info >/dev/null 2>&1 || fail "Docker is not reachable. Start Docker Desktop; on WSL also enable WSL integration for this distro (Settings → Resources → WSL integration)."
echo "node $(node --version), pnpm $(pnpm --version), $(docker --version)"

echo "==> Environment file"
if [ -f .env ]; then
  echo ".env already exists, leaving it alone"
else
  cp .env.example .env
  echo "Created .env from .env.example. Fill in the real values before running the app."
fi
# One way to load env: root scripts run `dotenv -- turbo ...`, and turbo passes the
# variables listed in turbo.json to each task. Packages never read .env themselves.

echo "==> Done"
