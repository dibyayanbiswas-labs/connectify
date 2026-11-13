# Build from the repo root, because the build needs the workspace packages:
#   docker build -f apps/api/Dockerfile -t connectify-api .

# ---- build: install the workspace and bundle the API with esbuild ----
FROM node:22-slim AS build
WORKDIR /repo

RUN npm install -g pnpm@12.18.0

# This layer depends on the lockfile alone, so code changes don't re-download packages.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @repo/api build

# ---- runtime: Node and the bundles only (no pnpm, no node_modules, no TypeScript) ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /repo/apps/api/dist ./dist
# migrate.js resolves "../drizzle" from its own file, so this sits next to dist/.
COPY --from=build /repo/packages/database/drizzle ./drizzle

# The official image ships a non-root "node" user; don't run as root.
USER node
EXPOSE 4000

# Exec (JSON array) form: Node is PID 1 and receives SIGTERM, which graceful shutdown needs.
# The shell form wraps it in sh, which swallows the signal.
CMD ["node", "--enable-source-maps", "dist/index.js"]
