# Build from the repo root, because the build needs the workspace packages:
#   docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:4000 -t connectify-web .

# ---- build: install the workspace and build Next.js in standalone mode ----
FROM node:22-slim AS build
WORKDIR /repo

RUN npm install -g pnpm@12.18.0

# This layer depends on the lockfile alone, so code changes don't re-download packages.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile

# Rewrites are written into the build output, so the API address is fixed at build time.
ARG API_URL
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @repo/web build

# ---- runtime: server.js and the node_modules it traced, nothing else ----
FROM node:22-slim
# HOSTNAME=0.0.0.0: otherwise Next listens inside the container only.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone mirrors the monorepo layout; it leaves out static assets and public/ on purpose.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

# Exec form: Node is PID 1 and receives SIGTERM.
CMD ["node", "apps/web/server.js"]
