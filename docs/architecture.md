# Connectify — Architecture (how)

> Part of the [Connectify docs](README.md). The _what & why_ lives in [prd.md](prd.md); the reasoning behind key choices lives in [decisions.md](decisions.md).

## 1. Architecture overview

    Browser (Next.js app)
       │  tRPC over HTTPS (cookies) · SSE for live updates
       ▼
    apps/web (Next.js on Vercel) ── /api/trpc proxy ──►  apps/api (Express on Railway/Render, long-running)
                                                            │
                                ┌───────────────────────────┼───────────────────────────┐
                                ▼                           ▼                           ▼
                         Postgres + pgvector         Corsair SDK                  Anthropic API
                         (Neon; Docker locally)      (Gmail, Calendar,            (fast + smart tiers)
                                                      webhooks, MCP)
                                                            ▲
                                       Google ──webhooks────┘

**Why each box exists**

- **Separate API (not only Next.js route handlers):**
  - SSE streams, webhooks, and background jobs need a **long-running process**.
  - Serverless functions time out and lose in-memory state.
  - (Lesson from Thread: running the API on Vercel serverless was where its live-site 500s came from.)
- **Web proxies `/api/trpc` to the API:** one origin for the browser → simple cookies, no CORS.
- **Postgres + pgvector, one database:**
  - Cache, queue, and search vectors in one place = one backup, one connection.
  - No separate vector DB until there are millions of rows.
- **Only `apps/api` talks to Corsair:** a single place for the encryption key, retries, and vendor-specific code.
- **No Redis in MVP:** a single API instance doesn't need cross-instance pub/sub. Add it when running >1 instance (an explicit "reversible later" decision).

## 2. Monorepo layout & dependency rule

    apps/
      web/          Next.js 16 (App Router), feature folders: features/{brief,queue,search,agent,settings}
      api/          Express 5: bootstrap, corsair.ts, routes/{webhooks,agent-stream,sync-events,mcp}, jobs/
    packages/
      database/     Drizzle schema, migrations, db client
      services/     Business logic behind interfaces (QueueService, MailService, CalendarService, AiService)
      trpc/         Routers + procedures (thin: validate → call service → map errors)
      tools/        Single tool registry (Zod schemas) shared by the agent and MCP
      logger/       Structured logger
      typescript-config/, eslint-config/

**Dependency rule (enforced by package.json deps):**
`web → trpc (types only) → services → database, logger`. Only `api` imports Corsair and wires the concrete implementations (dependency inversion), so services are testable with fakes.

## 3. Data model (Postgres)

| Table            | Purpose                                                                  | Key columns / notes                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`          | Identity                                                                 | id, email, name, avatar_url, created_at                                                                                                                                                                                |
| `accounts`       | Sign-in provider links ([ADR-3](decisions.md#adr-3-google-only-sign-in)) | user_id FK, provider (`google` only for now), provider_account_id · unique(provider, provider_account_id)                                                                                                              |
| `sessions`       | Auth sessions                                                            | id, user_id FK, expires_at, token_version                                                                                                                                                                              |
| `mail_items`     | Inbox cache                                                              | user_id FK, gmail_message_id, thread_id, from, subject, snippet, summary, priority, received_at, `search_tsv` (tsvector), `embedding` (vector(384)), `embedding_model`, expires_at · unique(user_id, gmail_message_id) |
| `queue_items`    | Approval queue                                                           | id, user_id FK, kind, status, payload (jsonb, discriminated by kind), idempotency_key (unique), source_message_id, error_message, processing_at, resolved_at, created_at                                               |
| `event_links`    | Event ↔ source email                                                     | user_id, google_event_id, source_thread_id, queue_item_id, replied_at (enables the post-meeting reply; "Remove from Connectify" deletes only this row)                                                                 |
| `sync_state`     | Incremental sync cursor                                                  | user_id, gmail_history_id, last_synced_at                                                                                                                                                                              |
| `agent_messages` | Chat history                                                             | session_id, user_id, role, content, created_at                                                                                                                                                                         |
| `audit_log`      | Who did what                                                             | user_id, action, queue_item_id, at                                                                                                                                                                                     |

**Conventions**

- `user_id`-first composite indexes.
- CHECK constraints mirror the TS enums (one source of truth for each enum).
- FKs with `ON DELETE CASCADE` from users, so account deletion is one statement.
- Corsair stores the OAuth tokens in its own encrypted tables; we never store raw tokens.

**Retention (view ≠ storage):**

- The _view window_ (24h…5w) is a filter.
- _Retention_ is a policy: `mail_items.expires_at = received_at + 35 days`; a nightly job purges expired rows.
- Windows beyond what's cached trigger an on-demand fetch with a cost warning.

## 4. Approval queue — the core state machine

    pending ──approve──► processing ──success──► approved
       │                    │
       │                    └──error──► failed ──retry──► processing
       └──dismiss──► dismissed

**Rules**

- **Atomic claim:** `UPDATE … SET status='processing' WHERE id=? AND user_id=? AND status IN ('pending','failed') RETURNING *`. Zero rows = someone else already claimed it → no-op.
- **At-least-once + idempotency:**
  - Each item carries an idempotency key, passed to Google where supported.
  - Before creating, check `event_links` for an event already created for this item.
- **Stale recovery:** a job resets `processing` items older than 5 min back to `failed` with a reason.
- **Edits:** the user can edit the payload while it's `pending`; the payload is re-validated with Zod on approve.

## 5. Sync design

- **Initial load:** on connect, fetch the last 24h via Corsair; store messages + `historyId`.
- **Incremental:**
  - A webhook arrives → enqueue a sync for that user → fetch changes since the stored `historyId`.
  - Upsert by `(user_id, gmail_message_id)`.
- **Webhooks are hints:**
  - A lost webhook is repaired by the next sync.
  - A fallback poll every 10 min handles silent gaps.
- **Live UI:** the API emits an SSE `{ type: "mail.updated" }` _hint_. The browser invalidates React Query, then refetches through tRPC. Never push payloads over SSE: one data path, one auth check.
- **Daily Brief:** read from the DB (stale-while-revalidate); trigger a background sync if `last_synced_at` is older than 2 min.

## 6. AI design

**Model routing**

- **Fast tier** (`claude-haiku-5-5`): summaries, priority, event extraction. High volume, short output.
- **Smart tier** (`claude-sonnet-5-5`): agent chat with tools, reply polishing.
- Model IDs live in config, not code.

**Structured output**

- Every LLM response that feeds code is parsed with a Zod schema.
- On parse failure: one retry, then fall back to heuristics (e.g., the priority rule "sender is my manager + contains a date").

**Free-tier limits (circuit breaker)**

- Summarize once per message (cached in `mail_items.summary`).
- Batch summaries.
- Daily token cap per user. Its purpose is to stop runaway usage (a looping agent, a 5-week backfill), not to control money. When it's exceeded, degrade to snippets + heuristics.
- On 429 from Anthropic: honor `Retry-After`, then degrade; never retry in a tight loop.

**Agent**

- Tool loop, max N iterations.
- Tools come from `packages/tools` (one Zod schema each → JSON Schema for both the agent and MCP, so they can't drift).
- **Write tools only create queue items.**

**Guardrails**

- System prompt scoped to mail/calendar.
- Email content wrapped in clearly delimited "untrusted data" blocks.
- Refuse off-topic requests.
- Cap tool calls and tokens per turn.

**Search (hybrid)**

- `tsvector` keyword rank + pgvector cosine similarity (HNSW index), merged with Reciprocal Rank Fusion.
- Embeddings are generated at ingest by a local `bge-small-en-v1.5` model (384 dimensions), behind an `EmbeddingProvider` interface ([ADR-4](decisions.md#adr-4-local-embedding-model)). Anthropic has no embeddings API.
- Each vector is stored with its `embedding_model`; queries only compare vectors from the same model.

## 7. Security

- **Auth:**
  - Google-only sign-in with `openid email profile` scopes; Gmail/Calendar access is a separate Corsair consent ([ADR-3](decisions.md#adr-3-google-only-sign-in)).
  - Our auth never sees Gmail tokens; Corsair never sees sessions.
  - Sessions are httpOnly, Secure, SameSite=Lax cookies; short-lived access token + refresh token with `token_version` for revocation.
  - Session handling sits behind one interface, so a bearer-token client (extension/mobile) can be added later ([ADR-2](decisions.md#adr-2-web-only-client-client-agnostic-api)).
- **CSRF:** custom header + Origin check on every mutation.
- **Tokens:** Corsair KEK encryption; the KEK lives only in the API's env, never in web.
- **Scopes:** request the minimum (gmail.readonly + gmail.send + calendar.events); explain each on the consent screen.
- **Logging:** never log bodies, tokens, or full addresses; log IDs.
- **Env:** each app/package validates its env with Zod at boot and **fails fast** if anything is missing.
- **Account deletion:** cascade delete + revoke the Google grant.

## 8. Infrastructure & environments

|                | Local dev                                       | Local prod-like (Phase 1+)           | Production (by Phase 3)                                         |
| -------------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| **Web**        | `pnpm dev` (Next.js)                            | Production build in `docker compose` | Vercel                                                          |
| **API**        | `pnpm dev` (tsx watch)                          | Production build in `docker compose` | Railway or Render (always-on, 1 instance)                       |
| **DB**         | Docker `pgvector/pgvector:pg17`                 | Same container                       | Neon (pgvector enabled)                                         |
| **Migrations** | `drizzle-kit migrate`                           | Run as a startup step before the API | Run as a deploy step **before** the new API starts              |
| **Secrets**    | `.env` (git-ignored) + `.env.example` committed | Same                                 | Platform secret stores                                          |
| **Google**     | OAuth client, redirect to localhost             | Same                                 | Separate OAuth client, prod redirect; Testing mode + test users |

**Why a "local prod-like" column:** it runs the same build that will ship, so "works in dev, breaks in prod" problems show up in Phase 1 instead of on deploy day ([ADR-5](decisions.md#adr-5-deployment-timing)).

**CI (GitHub Actions) on every push, from Phase 1:** install → typecheck → lint → unit tests → build. Integration tests run against a Postgres service container. From Phase 3: a Playwright smoke test after each deploy.

## 9. Observability & judging-day reliability

**Observability**

- Structured JSON logs with `requestId` and `userId`; dot-namespaced events (`queue.approve.failed`).
- OpenTelemetry traces API → Corsair → Anthropic, with spans for Google fetch, LLM call, and DB.
- Metrics: sync latency, cache hit rate, approval success/failure, LLM tokens/user/day.
- `/health` reports DB + Corsair + Anthropic reachability.

**Judging-day checklist**

- [ ] Live URL loads; the demo account signs in; the demo inbox has data.
- [ ] Prod smoke test passes (sign in → brief → approve → event appears in Google Calendar).
- [ ] No test artifacts, `.env` files, or secrets committed.
- [ ] Corsair MCP permission tool enabled and demonstrated.
- [ ] Every README claim is verifiable in the live app or the repo.

## 10. Testing strategy

| Layer       | Tool                   | What                                                                               |
| ----------- | ---------------------- | ---------------------------------------------------------------------------------- |
| Unit        | Vitest                 | Pure helpers, Zod schemas, priority heuristics, the guardrail regexes              |
| Service     | Vitest + fakes         | Services against `createFakeMailService()` etc. — no network                       |
| Integration | Vitest + real Postgres | Queue claim race (two concurrent approves → one event), stale recovery, migrations |
| E2E         | Playwright             | The core workflow against a fake Google provider; one smoke test against prod      |
