# Connectify — PRD (what & why)

> Part of the [Connectify docs](README.md). The _how_ lives in [architecture.md](architecture.md); the reasoning behind key choices lives in [decisions.md](decisions.md).

## 1. Problem

Knowledge workers receive far more email than they can act on. The few emails that matter — requests with deadlines — are buried among notifications, CCs, and newsletters. Turning one into a calendar reminder means reading, switching to Calendar, retyping the details, and picking a time. People either pay a human assistant to do this triage, or they miss deadlines.

**Connectify reads the inbox, surfaces what's actionable today, and drafts the calendar event — and nothing happens until the user approves it.**

## 2. Target user

**Primary persona: the overloaded developer**

- Receives ~150 emails/day; ~10 contain real action items from their manager or PM.
- Spends ~25–30 min each morning triaging.
- Creates every reminder by hand (6–8 clicks + typing each).
- Misses ~2 deadlines/month because a request was buried.
- Will **not** trust a tool that sends email or changes their calendar without asking.

**Secondary moment:** returning from 1–5 weeks of leave, facing a backlog.

## 3. Core workflow — before vs. after

| Step                         | Today (Gmail + Calendar)                                                     | With Connectify                                     |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Find actionable emails       | Scroll & read ~150 emails                                                    | Open Daily Brief: ranked, summarized                |
| Understand the request       | Open & read the full thread                                                  | Read the 2-line AI summary                          |
| Create the reminder          | Open Calendar → new event → title → date → time → save (6–8 clicks + typing) | Click **Approve** on the drafted event (1–2 clicks) |
| **Per task**                 | **6–8 clicks + typing**                                                      | **2–3 clicks, no typing**                           |
| **Morning total (10 tasks)** | **~70 clicks, ~25–30 min**                                                   | **~25 clicks, under 10 min**                        |

**Follow-up loop (Should):** after the meeting, paste raw notes → AI polishes them → a drafted reply on the original thread goes into the approval queue.

## 4. Constraints (imposed; not up for debate)

**From the hackathon brief**

- Stack: Next.js + Postgres + Corsair SDK.
- Gmail **and** Google Calendar must be integrated **through Corsair**.
- Deliverables: open-source repo, live link, YC-style demo video, posts, README.
- Original work only (plagiarism → disqualification). Thread is a reference, never a source.

**From Google**

- Gmail read/send scopes are **restricted scopes**. A public app needs Google verification plus a security assessment. Until then the app runs in **Testing mode: max 100 test users**, each added manually.
- API quotas apply per user and per project.

**From us**

- Solo developer, part-time, learning as we go → simplicity beats cleverness.
- Near-zero budget → free tiers everywhere. No dollar budget for the LLM, but usage is capped by a daily token limit per user (a circuit breaker, see §8).
- AI provider: Claude (Anthropic API).

## 5. Scope (MoSCoW)

### Must (MVP — the product doesn't exist without these)

1. Sign in with Google (identity only), then connect Gmail + Calendar via Corsair (a separate consent). See [ADR-3](decisions.md#adr-3-google-only-sign-in).
2. Fetch the last 24h of email; AI summary + priority per email.
3. **Daily Brief**: today's actionable emails + today's events.
4. AI-drafted calendar event from an email.
5. **Approval queue**: every write (event, reply) is a queue item the user approves, edits, or dismisses.
6. Create the event in Google Calendar on approval.
7. Disconnected-state handling (clear banner, no silent failures).

### Should (scored bonuses + differentiators)

8. Real-time sync via Corsair webhooks (new mail appears without refresh).
9. Hybrid search: keyword + semantic (pgvector), under 1 s.
10. Agent chat with tools (read mail, draft events) — writes still go through the queue.
11. Keyboard shortcuts + command palette (⌘K).
12. Post-meeting notes → polished reply → queue.
13. Corsair MCP endpoint, **with the permission tool enabled**.

### Could

14. Extended windows (48h / 72h / 1–5 weeks) with a cost warning.
15. Analytics page (counts, activity).
16. Voice input (STT) / read-aloud (TTS) in chat.

### Won't (this time)

Chrome extension and mobile apps (but the API stays client-agnostic so they can be added, see [ADR-2](decisions.md#adr-2-web-only-client-client-agnostic-api)) · support chatbot/tickets · 2FA · any sign-in other than Google (email/password, GitHub, Microsoft) · motion-graphics landing page · non-Google providers · two-way delete sync · auto-sending email without approval.

## 6. Success metrics (outcomes)

| #   | Metric                                                | Target                                       |
| --- | ----------------------------------------------------- | -------------------------------------------- |
| M1  | Email → approved calendar event                       | ≤ 3 clicks, < 30 s per task                  |
| M2  | Morning triage (150 emails → ~10 events)              | < 10 min total                               |
| M3  | Actions executed in Queue-First mode without approval | **0**, enforced in code and covered by tests |
| M4  | AI-drafted events approved without edits              | ≥ 70%                                        |

## 7. Acceptance criteria (testable behaviors)

- Empty window → "0 mails to read"; no events → "No upcoming events".
- Gmail or Calendar disconnected → explicit banner; no fetch is attempted; nothing fails silently.
- Approving the same item twice (double-click, two tabs) creates **one** event.
- Deleting an email in Connectify removes it from Connectify only; Gmail is untouched.
- **"Remove from Connectify"** on a past event deletes only our record (`event_links`); the event stays in Google Calendar. The button says "Remove from Connectify" with the hint "Stays in Google Calendar". If the event has no follow-up reply yet, warn that the reply option will be lost.
- Disconnecting Gmail/Calendar keeps the user's account; they can sign in and reconnect.
- The agent refuses off-topic requests and never executes a write without a queue item.

## 8. Quality attributes (ranked)

| Rank | Attribute                   | Measurable target                                                                                                                                                                                                                                                          |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Security & privacy**      | OAuth tokens encrypted at rest (Corsair KEK); no email bodies in logs; CSRF-protected mutations; untrusted email content fenced from agent instructions                                                                                                                    |
| 2    | **Reliability**             | Live demo works on judging day; an approval executes exactly once; external failures retried with a bounded cap, then surfaced to the user                                                                                                                                 |
| 3    | **Performance**             | Daily Brief renders from cache in < 300 ms (p95); search < 1 s                                                                                                                                                                                                             |
| 4    | **Cost / free-tier limits** | Stay within free-tier rate limits: summaries cached once per message and batched; a daily token cap per user acts as a circuit breaker (set from the limits in the Anthropic Console); when it's hit, degrade to snippets + heuristics; windows > 24h warn before spending |
| 5    | **Operability**             | Every request has a trace ID; structured logs; health endpoint reports DB + Corsair status; Google fetch, cache-hit, and approval latency measured                                                                                                                         |
| 6    | **Accessibility**           | Fully keyboard-operable; WCAG 2.2 AA contrast and focus states                                                                                                                                                                                                             |

> Ranking matters: when two attributes conflict, the higher one wins. Example: we won't cache email bodies in a third-party store for speed (3) because it hurts privacy (1).

## 9. Risks & failure modes

| Risk                                            | Likelihood           | Impact   | Mitigation                                                                                                                             |
| ----------------------------------------------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Google API errors / outage                      | Med                  | High     | Retry with exponential backoff + jitter (max 3); serve stale cache with a "last synced" label                                          |
| Google rate limits (429)                        | Med                  | Med      | Honor `Retry-After`; per-user cooldown; incremental sync instead of refetching                                                         |
| Webhook missed or delayed                       | High                 | Med      | Webhooks are **hints**, not truth: re-sync from the stored history cursor; periodic fallback poll                                      |
| LLM rate limit / quota exhausted                | **High** (free tier) | Med      | Fall back to heuristic priority + raw snippet; per-user daily token cap; max iterations on the agent loop                              |
| LLM returns malformed output                    | Med                  | Low      | Validate with Zod; on failure, fall back to heuristics, never crash                                                                    |
| Prompt injection via email content              | Med                  | **High** | Fence untrusted content; all writes go through the approval queue; cap sends per day                                                   |
| DB connection failure                           | Low                  | High     | Pooled connections; health check; fail fast at boot; bounded retry on transient errors                                                 |
| Approval executed twice                         | Med                  | High     | Atomic claim + idempotency key (see [architecture §4](architecture.md#4-approval-queue--the-core-state-machine))                       |
| Stuck in "processing" after a crash             | Low                  | Med      | Recovery job resets stale items after a timeout                                                                                        |
| Demo account or live link broken on judging day | Med                  | **High** | Judging-day checklist ([architecture §9](architecture.md#9-observability--judging-day-reliability)); synthetic smoke test against prod |

## 10. Milestones

| Phase | Deliverable                                          | Done when                                                                                         |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0     | Design docs reviewed                                 | Open questions answered ✅                                                                        |
| 1     | Walking skeleton                                     | web → api → db round-trip works in the local prod-like `docker compose`; CI green on every push   |
| 2     | Auth + DB                                            | Google sign-in/out works locally (prod-like build)                                                |
| 3     | Gmail + Calendar via Corsair + **first real deploy** | Brief shows real 24h mail; fake provider for tests; app live on free tiers with a prod smoke test |
| 4     | Approval queue                                       | Double-approve test passes; event created in Google                                               |
| 5     | AI summaries + priority + event drafts               | M4 measurable                                                                                     |
| 6     | Agent + tools + SSE                                  | Brief's "invite + email" example works end to end                                                 |
| 7     | Webhooks + incremental sync                          | New mail appears without refresh                                                                  |
| 7.5   | Hybrid search                                        | < 1 s on 5k emails                                                                                |
| 8     | MCP (official adapter with permissions + own tools)  | Callable from Claude Desktop                                                                      |
| 9     | Hardening, demo, README, video                       | Judging-day checklist all green                                                                   |
