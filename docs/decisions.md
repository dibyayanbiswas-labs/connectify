# Connectify — Decision records

> Part of the [Connectify docs](README.md). Format: Decision / Options considered / Why / What would change my mind. Decisions are never deleted; a reversed one is marked **Superseded by ADR-n**, and new ones are appended with the next number.

| ADR                                                 | Decision                                                  | Status   |
| --------------------------------------------------- | --------------------------------------------------------- | -------- |
| [ADR-1](#adr-1-no-auto-approve)                     | Every write goes through the approval queue               | Accepted |
| [ADR-2](#adr-2-web-only-client-client-agnostic-api) | Web client only; API stays client-agnostic                | Accepted |
| [ADR-3](#adr-3-google-only-sign-in)                 | Google-only sign-in, separate from Gmail/Calendar consent | Accepted |
| [ADR-4](#adr-4-local-embedding-model)               | Local `bge-small-en-v1.5` embeddings                      | Accepted |
| [ADR-5](#adr-5-deployment-timing)                   | CI + local prod build in Phase 1; real deploy by Phase 3  | Accepted |

## ADR-1: No auto-approve

- **Decision:** In the MVP, **every** write goes through the [approval queue](architecture.md#4-approval-queue--the-core-state-machine). There is no auto-approve.
- **Options considered:**
  - (a) Auto-approve everything, configurable.
  - (b) Auto-approve only low-risk actions (a private calendar hold), never email.
  - (c) Always queue.
- **Why (c):**
  - The product's promise is "nothing happens without me".
  - The agent reads untrusted email, so an injected instruction plus auto-send equals data exfiltration.
  - Building the queue path well matters more than building two paths.
- **What would change my mind:** usage data showing users approve >95% of a specific low-risk action type unedited → introduce (b) for that action type only, off by default.

## ADR-2: Web-only client, client-agnostic API

- **Decision:** Build only `apps/web` + `apps/api` now. A Chrome extension and mobile apps remain possible later.
- **Options considered:**
  - (a) Build web + extension together.
  - (b) Web only, but keep the API client-agnostic.
  - (c) Web only, without designing for other clients.
- **Why (b): keep doors open, but don't walk through them.**
  - Cheap now, expensive later:
    - The API is the only source of truth (no business logic in web).
    - tRPC procedures are also exposed as OpenAPI.
    - Session logic sits behind one interface, so a bearer-token client can be added.
    - Shared Zod schemas live in `packages/`.
  - Not built now (YAGNI): per-platform feature flags, per-client endpoints, a shared UI package, the bearer-token flow itself.
- **What would change my mind:** a real user asking for the extension or a mobile app.

## ADR-3: Google-only sign-in

_Identity is separate from Gmail/Calendar access._

- **Decision:** Google is the only identity provider (sign-up = first sign-in). Sign-in requests `openid email profile` only. Gmail/Calendar scopes are requested separately, through Corsair (incremental authorization).
- **Options considered:**
  - (a) Google + GitHub + Microsoft sign-in.
  - (b) Google only, with one combined consent.
  - (c) Google only, with two consents.
- **Why (c):**
  - The product requires a Google account anyway. Other providers would force account linking: emails that don't match, duplicate accounts, and a known source of account-takeover bugs.
  - **Identity ≠ integration.** Sign-in proves _who you are_; Corsair holds _what we can access_.
  - Two consents keep auth tokens and Gmail tokens isolated, so a user can disconnect Gmail without losing their account.
  - Asking for "read and send your email" on the first screen hurts sign-up.
- **Kept open:** an `accounts` table (`provider`, `provider_account_id`; see [data model](architecture.md#3-data-model-postgres)) instead of a `google_id` column on `users`, so adding a provider later is additive, not a migration.
- **What would change my mind:** supporting non-Google mail providers (currently Won't).

## ADR-4: Local embedding model

- **Decision:** `bge-small-en-v1.5` (384 dimensions), run in the API process via Transformers.js, behind an `EmbeddingProvider` interface.
- **Options considered:**
  - (a) Voyage AI (hosted): better quality, but a free quota and another API key.
  - (b) A local model: free, private, good enough for one person's inbox.
- **Why (b):** the [ranked quality attributes](prd.md#8-quality-attributes-ranked) decide it.
  - #1 Privacy: email text never leaves our server.
  - #4 Free-tier limits: no quota, no rate limits.
  - The cost (a model download of ~130 MB, plus CPU on the API) is acceptable at this scale.
- **Reversibility:**
  - Store `embedding_model` with every vector, because vectors from different models can't be compared.
  - Switching providers = config change + re-embedding rows where the model differs.
- **What would change my mind:** search quality below expectations on real inboxes, or API CPU becoming a bottleneck.

## ADR-5: Deployment timing

- **Decision:**
  - **Phase 1:** CI (typecheck, lint, test, build on every push) + a `docker compose` setup that runs the _production build_ locally.
  - **By Phase 3:** one real deploy on free tiers (Vercel + Railway/Render + Neon).
- **Options considered:**
  - (a) No deploy for now.
  - (b) CI + local production build now, real deploy by Phase 3.
  - (c) Deploy in Phase 1.
- **Why (b):**
  - Deploy problems are cheap when the system is small: missing env vars, migrations not running, cross-domain cookies, timeouts. (Thread lost ~5 points entirely at deploy time.)
  - (b) gets most of that benefit without hosting overhead while learning the basics.
  - Phase 3 is the deadline because Google OAuth redirects and Corsair webhooks need a real public URL.
- **What would change my mind:** needing a shareable link earlier (a demo, feedback from users).

---

## Resolved open questions

None open. Resolved on 2026-11-12:

| #   | Question                  | Resolution                                                                                                                                                        |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Embedding provider        | Local `bge-small-en-v1.5` ([ADR-4](#adr-4-local-embedding-model))                                                                                                 |
| 2   | Sign-in providers         | Google only, separate from Gmail/Calendar consent ([ADR-3](#adr-3-google-only-sign-in))                                                                           |
| 3   | LLM budget                | No dollar budget (free tier); daily token cap as a circuit breaker ([PRD §8](prd.md#8-quality-attributes-ranked), [architecture §6](architecture.md#6-ai-design)) |
| 4   | Deleting an expired event | Removes only our record; the event stays in Google Calendar ([PRD §7](prd.md#7-acceptance-criteria-testable-behaviors))                                           |
| 5   | Product name              | Keep "Connectify" for now; rename before any public launch                                                                                                        |
| 6   | Deploy timing             | CI + local prod-like build in Phase 1; first real deploy by Phase 3 ([ADR-5](#adr-5-deployment-timing))                                                           |
| 7   | Other clients             | Web + API now; API stays client-agnostic ([ADR-2](#adr-2-web-only-client-client-agnostic-api))                                                                    |
