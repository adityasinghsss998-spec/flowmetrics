cat > /mnt/user-data/outputs/README.md << 'READMEEOF'
<div align="center">

<img src="https://img.shields.io/badge/Status-Live%20%26%20Deployed-brightgreen?style=for-the-badge" />
<img src="https://img.shields.io/badge/Architecture-Microservices-6366f1?style=for-the-badge" />
<img src="https://img.shields.io/badge/Services-6%20Independent-0d9488?style=for-the-badge" />
<img src="https://img.shields.io/badge/AI%20Integration-Coming%20Soon-f59e0b?style=for-the-badge" />

<br />
<br />

```
███████╗██╗      ██████╗ ██╗    ██╗███╗   ███╗███████╗████████╗██████╗ ██╗ ██████╗███████╗
██╔════╝██║     ██╔═══██╗██║    ██║████╗ ████║██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝██╔════╝
█████╗  ██║     ██║   ██║██║ █╗ ██║██╔████╔██║█████╗     ██║   ██████╔╝██║██║     ███████╗
██╔══╝  ██║     ██║   ██║██║███╗██║██║╚██╔╝██║██╔══╝     ██║   ██╔══██╗██║██║     ╚════██║
██║     ███████╗╚██████╔╝╚███╔███╔╝██║ ╚═╝ ██║███████╗   ██║   ██║  ██║██║╚██████╗███████║
╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝
```

**Developer Analytics Platform · DORA Metrics · Real-Time Engineering Intelligence**

[**Live Demo →**](https://flowmetrics.vercel.app) &nbsp;·&nbsp; [**API Health**](https://flowmetrics-gateway.onrender.com/health) &nbsp;·&nbsp; [**Frontend Repo**](https://github.com/adityasinghsss998-spec/flowmetrics-frontend)

<br />

</div>

---

## What is FlowMetrics?

FlowMetrics is a **B2B developer analytics platform** that connects to your GitHub repositories and gives engineering teams real-time visibility into how they actually work — not how they think they work.

Engineering managers use it to answer questions like:
- *"Are we shipping faster or slower than last quarter?"*
- *"Which engineer is carrying the review load? Is that sustainable?"*
- *"Our deployment failure rate jumped to 30% this week — what changed?"*
- *"This PR has been open 5 days with no review — who is the bottleneck?"*

It does this by ingesting GitHub webhook events, running complex SQL analytics queries, and surfacing four industry-standard metrics known as **DORA metrics** — the gold standard for measuring engineering team performance, backed by Google's DevOps Research and Assessment program.

---

## DORA Metrics — What We Measure and Why

DORA metrics are the result of a multi-year study of 32,000+ engineering teams at Google. They found four metrics that predict both team performance and developer happiness better than any other combination.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DORA PERFORMANCE LEVELS                          │
├──────────────────────┬──────────────┬────────────┬──────────┬──────────┤
│ Metric               │ Elite        │ High       │ Medium   │ Low      │
├──────────────────────┼──────────────┼────────────┼──────────┼──────────┤
│ Deployment Frequency │ Multiple/day │ Daily      │ Weekly   │ Monthly  │
│ Lead Time for Change │ < 1 hour     │ < 1 day    │ < 1 week │ < 1 month│
│ Change Failure Rate  │ 0–5%         │ 5–10%      │ 10–30%   │ > 30%    │
│ Mean Time to Recover │ < 1 hour     │ < 1 day    │ < 1 week │ < 1 month│
└──────────────────────┴──────────────┴────────────┴──────────┴──────────┘
```

FlowMetrics calculates all four using pre-computed SQL columns and complex window functions, giving you answers in milliseconds instead of hours.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FLOWMETRICS SYSTEM                                  │
│                                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         EXTERNAL SOURCES                                 │   │
│   │                                                                           │   │
│   │   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐  │   │
│   │   │   GitHub     │          │   Browser    │          │  GitHub      │  │   │
│   │   │   Webhooks   │          │   (Next.js)  │          │  OAuth       │  │   │
│   │   │              │          │              │          │              │  │   │
│   │   │ PR events    │          │ User actions │          │ User auth    │  │   │
│   │   │ Deploy events│          │ Dashboard    │          │ Repo access  │  │   │
│   │   │ Review events│          │ Real-time UI │          │              │  │   │
│   │   └──────┬───────┘          └──────┬───────┘          └──────┬───────┘  │   │
│   └──────────┼───────────────────────────┼──────────────────────────┼────────┘   │
│              │                           │                          │             │
│              │  Webhook POST             │  HTTPS Requests          │  OAuth Flow │
│              │                           │                          │             │
│   ┌──────────▼───────────────────────────▼──────────────────────────▼────────┐   │
│   │                                                                           │   │
│   │                         API GATEWAY  :3000                               │   │
│   │                                                                           │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │  • JWT verification (decodes token, injects x-user-id headers) │    │   │
│   │   │  • Route-based proxying to downstream services                  │    │   │
│   │   │  • Rate limiting (auth endpoints: 20 req/15min)                 │    │   │
│   │   │  • Internal route blocking (/internal/* blocked from outside)   │    │   │
│   │   │  • GitHub token injection (fetches from Redis, injects header)  │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                           │   │
│   └────┬──────────────┬───────────────┬──────────────┬────────────────────┘   │
│        │              │               │              │                          │
└────────┼──────────────┼───────────────┼──────────────┼──────────────────────────┘
         │              │               │              │
         ▼              ▼               ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
   │  auth    │  │  github  │  │  analytics   │  │  dashboard   │
   │ service  │  │ service  │  │  service     │  │  service     │
   │  :3001   │  │  :3002   │  │  :3003       │  │  :3005       │
   └──────────┘  └──────────┘  └──────────────┘  └──────────────┘
```

---

### Microservices — What Each One Owns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE RESPONSIBILITIES                             │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  auth-service :3001          Database: flowmetrics_auth               │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • User register / login (email + password)                           │   │
│  │  • GitHub OAuth (login + connect-existing-account flows)              │   │
│  │  • JWT access token (15min) + refresh token (7d) lifecycle            │   │
│  │  • Organization CRUD — create, invite, manage members                 │   │
│  │  • Role-based membership (owner / admin / member)                     │   │
│  │  • GitHub access token cache in Redis (for gateway injection)         │   │
│  │  • Internal endpoint: GET /internal/orgs/:orgId/members/:userId/role  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  github-service :3002        Database: flowmetrics_github             │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • Repository connection — registers GitHub webhooks automatically    │   │
│  │  • Historical sync — backfills all PRs, reviews, deployments, commits │   │
│  │  • Webhook ingestion — processes live GitHub events in real-time      │   │
│  │  • Pre-computes cycle_time_hours and lead_time_hours at write time    │   │
│  │  • Publishes events to RabbitMQ after each webhook (pr.merged etc.)   │   │
│  │  • org-level authorization via requireOrgRole middleware               │   │
│  │  • Object-level authorization (repo must belong to requesting org)    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  analytics-service :3003     Database: flowmetrics_github (read-only) │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • Pure CQRS read model — zero writes, only SELECT queries            │   │
│  │  • Raw Sequelize SQL (no ORM) — window functions, CTEs, PERCENTILE   │   │
│  │  • Calculates all 4 DORA metrics with period-over-period comparison   │   │
│  │  • Cycle time trend with 3-week rolling average                       │   │
│  │  • Contributor leaderboard (authors + reviewers + commit frequency)   │   │
│  │  • Review heatmap (day-of-week × hour-of-day aggregation)             │   │
│  │  • Redis caching: 30min TTL for DORA, 2min for open PRs               │   │
│  │  • Pattern-based cache invalidation on new events                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  notification-service :3004  No database                              │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • Pure RabbitMQ consumer — no HTTP endpoints                         │   │
│  │  • Consumes weekly.digest → fetches metrics → sends HTML email        │   │
│  │  • Consumes anomaly.# → sends styled alert emails                     │   │
│  │  • Dead Letter Queue configured for failed message handling           │   │
│  │  • Email via Resend SMTP (not Gmail — works in production)             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  dashboard-service :3005     No database                              │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • Socket.io server for real-time dashboard updates                   │   │
│  │  • RabbitMQ consumer — receives pr.*, deployment.*, anomaly.* events  │   │
│  │  • Redis pub/sub bridge for multi-instance scalability                │   │
│  │  • Client joins repo:${repoId} rooms via join:repo Socket.io event    │   │
│  │  • Ephemeral queue with 60s TTL (real-time events, not persisted)     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Database Schema

```
flowmetrics_auth                          flowmetrics_github
════════════════                          ══════════════════

┌─────────────┐                          ┌──────────────────┐
│    users    │                          │  repositories    │
│─────────────│                          │──────────────────│
│ id (PK)     │                          │ id (PK)          │
│ name        │                          │ github_repo_id   │ ← unique, GitHub's ID
│ email       │ ◄── unique               │ org_id           │
│ password    │                          │ owner_id         │
│ github_id   │ ◄── unique, nullable     │ name             │
│ github_user │                          │ full_name        │
│ github_token│ ◄── stored encrypted     │ default_branch   │
│ avatar_url  │                          │ webhook_id       │
│ refresh_tok │                          │ github_accs_token│ ← denormalized for perf
└──────┬──────┘                          │ last_synced_at   │
       │                                 └────────┬─────────┘
       │ 1                                        │ 1
       │                                          │
       ▼ M                                        ▼ M
┌──────────────┐                          ┌──────────────────┐
│organizations │                          │  pull_requests   │
│──────────────│                          │──────────────────│
│ id (PK)      │                          │ id (PK)          │
│ name         │                          │ github_pr_id     │
│ slug ◄─unique│                          │ repo_id (FK)     │
│ owner_id (FK)│                          │ number           │
└──────┬───────┘                          │ title            │
       │                                  │ author_username  │
       │ M                                │ state            │ ENUM
       │                                  │ additions        │
       ▼ M                                │ deletions        │
┌──────────────┐                          │ cycle_time_hours │ ← PRE-COMPUTED
│  org_members │                          │ lead_time_hours  │ ← PRE-COMPUTED
│──────────────│                          │ first_review_at  │
│ id (PK)      │                          │ pr_opened_at     │
│ org_id (FK)  │                          │ pr_merged_at     │
│ user_id (FK) │                          └────────┬─────────┘
│ role  ◄─ENUM │                                   │ 1
│ UNIQUE(o,u)  │                                   │
└──────────────┘                                   ▼ M
                                          ┌──────────────────┐
                                          │   pr_reviews     │
                                          │──────────────────│
                                          │ id (PK)          │
                                          │ github_review_id │ ← unique
                                          │ pr_id (FK)       │
                                          │ repo_id          │
                                          │ reviewer_username │
                                          │ state      ◄─ENUM│
                                          │ submitted_at     │
                                          └──────────────────┘

                                          ┌──────────────────┐
                                          │   deployments    │
                                          │──────────────────│
                                          │ id (PK)          │
                                          │ github_deploy_id │ ← nullable (manual)
                                          │ repo_id (FK)     │
                                          │ environment      │
                                          │ status     ◄─ENUM│
                                          │ sha              │
                                          │ deployed_at      │ ← pipeline START
                                          │ completed_at     │ ← pipeline END
                                          │ build_dur_mins   │ ← PRE-COMPUTED
                                          │ lead_time_hours  │ ← PRE-COMPUTED
                                          └──────────────────┘

                                          ┌──────────────────┐
                                          │    commits       │
                                          │──────────────────│
                                          │ id (PK)          │
                                          │ sha   ◄─ unique  │
                                          │ repo_id (FK)     │
                                          │ pr_id (FK)       │
                                          │ author_username  │
                                          │ message          │
                                          │ additions        │
                                          │ deletions        │
                                          │ committed_at     │ ← used for real lead time
                                          └──────────────────┘
```

---

### Event-Driven Architecture — The Message Queue System

This is the core of what makes FlowMetrics real-time and resilient.

```
                    ╔═══════════════════════════════════════════════════╗
                    ║           RABBITMQ TOPIC EXCHANGE                  ║
                    ║           exchange: 'flowmetrics'                   ║
                    ║           type: topic                               ║
                    ╚═══════════════════════════════════════════════════╝
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            Routing Keys:               │             Routing Keys:
            pr.merged                  │             weekly.digest
            pr.opened                  │             anomaly.#
            pr.closed                  │
            deployment.completed       │
            deployment.failed          │
            anomaly.detected           │
                    │                   │                   │
                    ▼                   │                   ▼
    ┌───────────────────────────┐       │   ┌───────────────────────────────┐
    │  Queue: dashboard.        │       │   │  Queue: notification.         │
    │  realtime_events          │       │   │  weekly_digest                │
    │  ─────────────────────    │       │   │  ──────────────────────────   │
    │  Bindings:                │       │   │  Binding: weekly.digest       │
    │    pr.*                   │       │   │  DLQ configured               │
    │    deployment.*           │       │   │  Durable: true                │
    │    anomaly.*              │       │   └───────────────┬───────────────┘
    │  ─────────────────────    │       │                   │
    │  durable: false           │       │   ┌───────────────────────────────┐
    │  ttl: 60 seconds          │       │   │  Queue: notification.         │
    │  (ephemeral real-time)    │       │   │  anomaly_alert                │
    └────────────┬──────────────┘       │   │  ──────────────────────────   │
                 │                       │   │  Binding: anomaly.#           │
                 │                       │   │  (matches all subtypes)       │
                 ▼                       │   │  DLQ configured               │
    ┌──────────────────────────┐         │   └───────────────┬───────────────┘
    │   dashboard-service      │         │                   │
    │  ───────────────────     │         │                   ▼
    │  Reads from queue        │         │   ┌───────────────────────────────┐
    │  → Redis pub/sub         │         │   │   notification-service        │
    │  → Socket.io emit        │         │   │  ──────────────────────────   │
    │    to repo:${repoId}     │         │   │  weekly digest: fetches DORA  │
    └──────────────────────────┘         │   │  metrics → sends HTML email   │
                                         │   │                               │
    ┌──────────────────────────┐         │   │  anomaly alert: sends styled  │
    │  Dead Letter Exchange     │◄────────┘   │  alert email with severity    │
    │  flowmetrics.dlx          │             └───────────────────────────────┘
    │  ───────────────────      │
    │  Catches failed messages  │         ┌───────────────────────────────────┐
    │  from both queues         │         │     DEAD LETTER QUEUES            │
    │  → dlq.weekly_digest      │──────►  │  ──────────────────────────────   │
    │  → dlq.anomaly_alert      │         │  Stores messages that failed      │
    └──────────────────────────┘         │  processing after all retries.    │
                                          │  Inspect via RabbitMQ management  │
                                          │  UI to debug notification issues. │
                                          └───────────────────────────────────┘
```

### Why Topic Exchange Instead of Direct Queues

A **topic exchange** lets you route one message to multiple consumers based on routing key patterns. The `#` wildcard matches zero or more words. So:

- `anomaly.#` matches `anomaly.detected`, `anomaly.cycle_time`, `anomaly.deployment`, `anomaly.stale_prs`
- Future anomaly types automatically route without config changes
- `pr.*` matches `pr.merged`, `pr.opened`, `pr.closed` — one binding handles all PR events
- `dashboard-service` and `notification-service` subscribe to different subsets of the same events

This is more powerful than simple named queues — adding a new event type never requires changing the exchange or existing consumer bindings.

---

### Real-Time Data Flow — From GitHub to Browser

```
Engineer merges a PR on GitHub
        │
        │  GitHub webhook POST (within 1 second)
        ▼
https://your-domain.com/api/v1/webhooks/github
        │
        │  (no auth — verified by HMAC-SHA256 signature)
        ▼
┌─────────────────────────────────────────────┐
│              api-gateway :3000               │
│  • Verifies no /internal/ prefix             │
│  • Proxies to github-service                 │
└──────────────────────────┬──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────┐
│           github-service :3002               │
│                                             │
│  1. Verify HMAC-SHA256 webhook signature    │
│  2. Find repo by github_repo_id in MySQL    │
│  3. Upsert pull_request row                 │
│     ↳ calculate cycle_time_hours            │
│     ↳ calculate lead_time_hours (commits)   │
│  4. Fetch + store PR commits from GitHub API│
│  5. Publish to RabbitMQ:                    │
│     routing key: 'pr.merged'                │
│     payload: { repoId, prNumber, ... }      │
└──────────┬──────────────────────────────────┘
           │
           │  RabbitMQ topic exchange: 'flowmetrics'
           │  routing key: 'pr.merged'
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌─────────────────────┐             ┌────────────────────────┐
│  dashboard-service  │             │  (weekly digest queue  │
│                     │             │   doesn't match pr.*)  │
│  Reads from queue   │             └────────────────────────┘
│  Publishes to Redis │
│  channel:           │
│  'dashboard:events' │
└──────────┬──────────┘
           │
           │  Redis pub/sub broadcast
           │  (all dashboard-service instances)
           ▼
┌─────────────────────────────────────────────┐
│         Socket.io emit to room:              │
│         'repo:${repoId}'                    │
│                                             │
│  Event: 'pr:merged'                         │
│  Data: { prNumber, author, cycleTime, ... } │
└──────────────────────────┬──────────────────┘
                           │
                           │  WebSocket (real-time, < 100ms total)
                           ▼
┌─────────────────────────────────────────────┐
│            Browser (Next.js)                 │
│                                             │
│  socket.on('pr:merged', (data) => {         │
│    queryClient.invalidateQueries(           │
│      ['dora', repoId]                       │
│      ['cycle-trend', repoId]                │
│      ['open-prs', repoId]                   │
│    )                                        │
│  })                                         │
│                                             │
│  → React Query refetches in background      │
│  → Dashboard updates without page refresh   │
└─────────────────────────────────────────────┘

Total time: GitHub merge → dashboard update ≈ 2-5 seconds
```

---

### Analytics Query Architecture — Why SQL, Why Pre-Computed

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ANALYTICS QUERY STRATEGY                         │
│                                                                       │
│  Option A — Compute at query time (naive approach):                  │
│  ─────────────────────────────────────────────────                   │
│  SELECT AVG(TIMESTAMPDIFF(HOUR, pr_opened_at, pr_merged_at))         │
│  FROM pull_requests                                                   │
│  WHERE repo_id = 1                                                    │
│  ← runs on EVERY dashboard load                                       │
│  ← scans thousands of rows each time                                  │
│  ← slow at scale, expensive                                           │
│                                                                       │
│  Option B — Pre-compute at write time (our approach):                │
│  ──────────────────────────────────────────────────                   │
│  When webhook fires:                                                  │
│    cycle_time_hours = HOURS(pr_merged_at - pr_opened_at)             │
│    lead_time_hours  = HOURS(pr_merged_at - first_commit.committed_at)│
│    build_duration_minutes = MINUTES(completed_at - deployed_at)      │
│    → stored on the row immediately                                    │
│                                                                       │
│  Then analytics query becomes:                                        │
│  SELECT AVG(cycle_time_hours) FROM pull_requests WHERE repo_id = 1  │
│  ← reads pre-computed column, no calculation                          │
│  ← sub-millisecond with index on repo_id                             │
│                                                                       │
│  This is why complex analytics run fast even with years of PR data.  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      REDIS CACHING LAYER                              │
│                                                                       │
│  Request for DORA metrics:                                           │
│                                                                       │
│  Browser → gateway → analytics-service                               │
│                           │                                          │
│                     Check Redis:                                      │
│                     key: 'dora:repo_1:30days'                        │
│                           │                                          │
│                    ┌──────┴──────┐                                   │
│                    │             │                                    │
│                  HIT           MISS                                   │
│                    │             │                                    │
│                    ▼             ▼                                    │
│              Return cached   Run 5 parallel                          │
│              JSON (< 1ms)    SQL queries                             │
│                              Store result                            │
│                              TTL: 1800s                              │
│                              Return JSON                             │
│                                                                       │
│  Cache TTLs:                                                          │
│  • DORA metrics:       30 minutes (historical, changes slowly)       │
│  • Deployment trends:  30 minutes                                    │
│  • Contributor stats:  10 minutes (changes with each PR)             │
│  • Open PRs:            2 minutes (needs to be fresh)                │
│  • Recent deploys:      2 minutes (needs to be fresh)                │
│                                                                       │
│  Cache invalidation:                                                  │
│  When pr.merged arrives → invalidate 'dora:repo_1:*',               │
│                           'cycle_*:repo_1:*',                        │
│                           'contributors:repo_1:*'                    │
│  Explicit key patterns (no wildcard scan) for Redis performance.     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Authorization Model — Two Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION LAYERS                             │
│                                                                       │
│  Layer 1 — JWT (api-gateway):                                        │
│  ─────────────────────────────                                        │
│  Every request: gateway verifies JWT, injects:                       │
│    x-user-id: '1'                                                    │
│    x-user-name: 'Aditya'                                             │
│    x-user-email: 'a@b.com'                                           │
│    x-user-github: 'aditya1234'                                       │
│  Downstream services read these headers — never raw tokens.          │
│                                                                       │
│  Layer 2 — Org Role (github-service requireOrgRole middleware):      │
│  ────────────────────────────────────────────────────────────        │
│  For org-scoped routes, middleware calls auth-service internal API:  │
│    GET /internal/orgs/:orgId/members/:userId/role                    │
│  Returns: { role: 'owner' | 'admin' | 'member' } or 404             │
│                                                                       │
│  Sets on req:                                                        │
│    req.verifiedOrgId  ← controller uses this, not req.body.orgId    │
│    req.userOrgRole    ← 'owner' | 'admin' | 'member'                │
│                                                                       │
│  Controller then checks:                                             │
│    repo.org_id === req.verifiedOrgId ← object-level authorization   │
│                                                                       │
│  Permission Matrix:                                                   │
│  ──────────────────                                                   │
│  READ all analytics data:    owner + admin + member                  │
│  Connect repo:               owner + admin                           │
│  Disconnect repo:            owner + admin                           │
│  Invite members:             owner + admin                           │
│  Remove members:             owner only                              │
│  Change roles:               owner only                              │
│  Delete org:                 owner only                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology | Purpose | Why This Choice |
|---|---|---|
| **Node.js + Express** | HTTP server for each microservice | Non-blocking I/O ideal for webhook-heavy workloads |
| **MySQL 8 + Sequelize** | Primary database with migrations | Window functions, CTEs, PERCENTILE_CONT for analytics |
| **Sequelize CLI** | Schema version control via migrations | Database state is reproducible and tracked in git |
| **Redis + ioredis** | Caching + pub/sub | Sub-millisecond reads for cached analytics, pub/sub for multi-instance Socket.io |
| **RabbitMQ (topic exchange)** | Async event-driven messaging | Decouples webhook ingestion from notification/dashboard delivery |
| **Socket.io** | Real-time WebSocket connections | Browser ↔ dashboard-service bidirectional events |
| **Axios** | Service-to-service HTTP | Internal API calls (auth-service role checks, analytics fetches) |
| **JWT (jsonwebtoken)** | Stateless auth | 15min access + 7d refresh token pair |
| **bcrypt** | Password hashing | Industry standard, 10 salt rounds |
| **GitHub REST API** | Historical data sync | Backfill PRs, reviews, commits, deployments on repo connect |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | React framework with SSR/SSG |
| **TypeScript** | Full type safety across all components and API calls |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library built on Radix primitives |
| **@tanstack/react-query** | Server state management, caching, background refetch |
| **Zustand** | Client state (auth, real-time event log, UI state) |
| **Socket.io-client** | Real-time dashboard updates |
| **Recharts** | 2D analytics charts (cycle time, deployment frequency) |
| **React Three Fiber + Drei** | 3D hero visualization |
| **Framer Motion** | Animations and transitions |

---

## API Reference

All requests go through `https://api.yourdomain.com/api/v1`.
Protected routes require `Authorization: Bearer <accessToken>`.

```
AUTH
  POST   /auth/register                 Register with email + password
  POST   /auth/login                    Login, receive JWT pair
  GET    /auth/github                   Initiate GitHub OAuth login
  GET    /auth/github/connect           Connect GitHub to existing account (protected)
  GET    /auth/github/callback          GitHub OAuth callback (handled by backend)
  POST   /auth/refresh                  Silent token refresh
  POST   /auth/logout                   Invalidate refresh token
  GET    /auth/me                       Current user info

ORGANIZATIONS
  POST   /orgs                          Create organization
  GET    /orgs                          My organizations
  GET    /orgs/:slug                    Organization details + members
  POST   /orgs/:orgId/members           Invite member (owner/admin)
  DELETE /orgs/:orgId/members/:userId   Remove member (owner only)
  PATCH  /orgs/:orgId/members/:userId/role  Change role (owner only)

REPOSITORIES
  GET    /repos/available               List GitHub repos user can connect
  POST   /repos/connect                 Connect repo + register webhook
  DELETE /repos/:id                     Disconnect repo + remove webhook
  GET    /repos/org/:orgId              All connected repos for an org

ANALYTICS (all require ?repoId=N)
  GET    /analytics/dora                4 DORA metrics with period comparison
  GET    /analytics/cycle-time/trend    Weekly cycle + lead time trend (90d)
  GET    /analytics/cycle-time/summary  Aggregate cycle time stats
  GET    /analytics/cycle-time/by-size  PR size vs cycle time buckets
  GET    /analytics/contributors        Author + reviewer leaderboards
  GET    /analytics/contributors/:user/trend  Per-person weekly trend
  GET    /analytics/reviews/heatmap     Review activity by day + hour
  GET    /analytics/deployments/frequency  Deploy frequency trend
  GET    /analytics/deployments/build-duration  Build time trend
  GET    /analytics/deployments/recent  Latest 15 deployments
  GET    /analytics/prs/open            Open PRs with waiting time
  DELETE /analytics/cache/:repoId       Force cache invalidation

WEBHOOKS (no auth — HMAC verified)
  POST   /webhooks/github               GitHub webhook receiver
```

---

## Project Structure

```
flowmetrics/
├── api-gateway/                    # JWT auth, routing, rate limiting
│   └── src/
│       ├── middlewares/
│       │   ├── authMiddleware.js
│       │   ├── optionalAuthMiddleware.js
│       │   └── githubTokenMiddleware.js
│       └── index.js
│
├── auth-service/                   # Users, orgs, GitHub OAuth
│   └── src/
│       ├── config/
│       │   ├── database.js
│       │   ├── config.js           # Sequelize CLI config
│       │   └── redis.js
│       ├── models/
│       │   ├── index.js            # Associations defined here
│       │   ├── user.js
│       │   ├── organization.js
│       │   └── orgMember.js
│       ├── migrations/             # Versioned schema changes
│       ├── repositories/
│       ├── services/
│       ├── controllers/
│       └── routes/v1/
│
├── github-service/                 # Webhook ingestion, repo management
│   └── src/
│       ├── config/
│       │   ├── database.js
│       │   ├── rabbitmq.js
│       │   └── axios.js            # authClient for role checks
│       ├── models/
│       │   ├── repository.js
│       │   ├── pullRequest.js      # cycle_time_hours pre-computed column
│       │   ├── prReview.js
│       │   ├── deployment.js       # completed_at + build_duration_minutes
│       │   └── commit.js           # committed_at for real lead time
│       ├── migrations/
│       ├── repositories/
│       ├── services/
│       │   ├── githubApiService.js # All GitHub API calls
│       │   ├── repoService.js      # Connect, sync, disconnect
│       │   └── webhookService.js   # Process webhook events
│       ├── middlewares/
│       │   └── requireOrgRole.js   # Calls auth-service, verifies role
│       └── controllers/
│
├── analytics-service/              # Read-only SQL analytics + caching
│   └── src/
│       ├── config/
│       │   ├── database.js         # Reads flowmetrics_github DB
│       │   └── redis.js
│       ├── repositories/
│       │   ├── doraRepository.js   # 4 DORA metrics, MTTR self-join
│       │   ├── cycleTimeRepository.js  # Window functions, rolling avg
│       │   ├── contributorRepository.js # Leaderboards, heatmap
│       │   └── deploymentRepository.js  # Frequency, build duration
│       └── services/
│           └── analyticsService.js  # Redis caching + DORA level classification
│
├── notification-service/           # Email delivery via RabbitMQ
│   └── src/
│       ├── config/
│       │   ├── mailer.js           # Resend SMTP
│       │   └── rabbitmq.js
│       ├── consumers/
│       │   ├── weeklyDigestConsumer.js
│       │   └── anomalyConsumer.js
│       └── templates/
│           ├── weeklyDigest.js     # Full HTML email template
│           └── anomalyAlert.js     # Severity-coded alert email
│
├── dashboard-service/              # Socket.io real-time bridge
│   └── src/
│       ├── config/
│       │   ├── redis.js            # pub + sub clients
│       │   └── rabbitmq.js
│       ├── consumers/
│       │   └── eventConsumer.js    # RabbitMQ → Redis pub/sub
│       └── socket/
│           └── dashboardSocket.js  # Redis sub → Socket.io emit
│
└── flowmetrics-frontend/           # Next.js + TypeScript + shadcn
    └── src/
        ├── app/
        │   ├── (auth)/             # Login, register, OAuth callback
        │   └── (dashboard)/        # Protected dashboard pages
        ├── components/
        │   ├── analytics/          # All chart components
        │   ├── three/              # 3D components (dynamic import, ssr:false)
        │   └── ui/                 # shadcn generated components
        ├── hooks/
        │   ├── useSocket.ts        # Socket.io + React Query invalidation
        │   └── useGithubConnect.ts # GitHub OAuth connect flow
        ├── store/
        │   ├── authStore.ts        # Zustand persisted auth state
        │   └── realtimeStore.ts    # Zustand real-time event log
        └── types/
            └── api.ts              # All API response TypeScript types
```

---

## Getting Started — Local Development

### Prerequisites
- Node.js 20+
- MySQL 8.0
- Redis 7
- RabbitMQ 3.12 (with management plugin)
- GitHub OAuth App

### 1. Clone and Install
```bash
git clone https://github.com/adityasinghsss998-spec/flowmetrics.git
cd flowmetrics

# Install dependencies for all services
for service in api-gateway auth-service github-service analytics-service notification-service dashboard-service; do
  cd $service && npm install && cd ..
done

cd flowmetrics-frontend && npm install && cd ..
```

### 2. Create MySQL Databases
```sql
mysql -u root -p
CREATE DATABASE flowmetrics_auth;
CREATE DATABASE flowmetrics_github;
EXIT;
```

### 3. Create GitHub OAuth App
Go to github.com/settings/developers → New OAuth App
```
Homepage URL:              http://localhost:3001
Authorization callback:    http://localhost:3001/api/v1/auth/github/callback
```
Copy Client ID and Client Secret.

### 4. Set Up Environment Variables
Copy `.env.example` in each service folder and fill in values.
Key variables:
```bash
# All services
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=your_mysql_password
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost

# auth-service
ACCESS_SECRET=minimum_32_chars_random_string
REFRESH_SECRET=another_32_chars_random_string
GITHUB_CLIENT_ID=from_github_oauth_app
GITHUB_CLIENT_SECRET=from_github_oauth_app

# github-service
GITHUB_WEBHOOK_SECRET=any_random_string
WEBHOOK_BASE_URL=http://localhost:3002
AUTH_SERVICE_URL=http://localhost:3001

# frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3005
```

### 5. Run Migrations
```bash
cd auth-service && npx sequelize-cli db:migrate && cd ..
cd github-service && npx sequelize-cli db:migrate && cd ..
```

### 6. Start All Services
Open 7 terminals:
```bash
cd api-gateway          && npm run dev   # Terminal 1: port 3000
cd auth-service         && npm run dev   # Terminal 2: port 3001
cd github-service       && npm run dev   # Terminal 3: port 3002
cd analytics-service    && npm run dev   # Terminal 4: port 3003
cd notification-service && npm run dev   # Terminal 5: port 3004
cd dashboard-service    && npm run dev   # Terminal 6: port 3005
cd flowmetrics-frontend && npm run dev   # Terminal 7: port 3001 (Next.js)
```

### 7. Verify Everything Is Running
```bash
curl http://localhost:3000/health
# Expected: { "status": "ok", "services": { ... } }
```

---

## Live Webhook Data (ngrok for local dev)

For GitHub to send webhooks to your local machine:

```bash
# Install ngrok, then:
ngrok http 3000

# Copy the https URL (e.g. https://abc123.ngrok.io)
# Update github-service .env:
WEBHOOK_BASE_URL=https://abc123.ngrok.io

# The app will use this URL when registering webhooks on connected repos
```

When you connect a repo through the UI, FlowMetrics automatically registers the webhook.
After that, every PR, review, and deployment event appears in real-time on the dashboard.

---

## ⚠️ AI Integration — Coming Soon

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│   🚧  AI ANALYST SERVICE — UNDER DEVELOPMENT                        │
│                                                                       │
│   FlowMetrics is being extended with an agentic AI analyst          │
│   that can answer natural language questions about your team's       │
│   engineering metrics.                                               │
│                                                                       │
│   Example queries it will handle:                                    │
│   ─────────────────────────────────                                  │
│   "Why is our cycle time increasing this month?"                     │
│   "Which engineer should review this PR about auth?"                 │
│   "Are we on track to hit elite DORA performance by Q4?"            │
│   "What changed when our failure rate jumped last week?"             │
│                                                                       │
│   Technical Stack (Planned):                                         │
│   ──────────────────────────                                         │
│   • LangGraph — stateful multi-step agent with explicit graph nodes  │
│     (intentParser → toolExecutor → anomalyDetector → responseWriter)│
│   • Gemini 1.5 Pro with function calling — agent autonomously        │
│     decides which SQL analytics tools to call based on the question  │
│   • LangSmith — full observability, tracing, and evaluation suite   │
│   • Advanced RAG — Pinecone vector DB + BM25 hybrid search +        │
│     cross-encoder reranking for domain knowledge retrieval           │
│   • HITL (Human-in-the-Loop) — LangGraph interrupt nodes pause      │
│     execution before irreversible actions (PR comments, assignments) │
│                                                                       │
│   Agent Tools (when complete):                                       │
│   ─────────────────────────────                                      │
│   • analyticsTool — wraps analytics-service HTTP endpoints           │
│   • githubMcpTool — GitHub MCP for real-time repo state + actions   │
│   • ragTool — retrieves relevant context from vector DB              │
│   • anomalyDetector — background job scanning for metric anomalies  │
│                                                                       │
│   Architecture principle:                                            │
│   If the AI service goes down, all manual analytics still work       │
│   perfectly. AI is additive, never structural.                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deployment

### Current: Render + External Services (No Credit Card Required)

```
Service               Platform          Notes
─────────────────────────────────────────────────────────────
api-gateway           Render (free)     Kept warm by UptimeRobot
auth-service          Render (free)     Kept warm by UptimeRobot
github-service        Render (free)     Kept warm by UptimeRobot
analytics-service     Render (free)     Kept warm by UptimeRobot
notification-service  Render (free)     RabbitMQ consumer only
dashboard-service     Render (free)     Socket.io
MySQL                 Aiven.io (free)   Never expires, SSL required
Redis                 Upstash (free)    TLS connection, 10k cmd/day
RabbitMQ              CloudAMQP (free)  Little Lemur plan, forever
Email                 Resend (free)     3,000 emails/month
Frontend              Vercel (free)     Auto-deploy from GitHub
Keep-alive            UptimeRobot       Pings /health every 5 min
```

### Planned: Oracle Cloud Always Free VM

Single Ubuntu VM (4 ARM cores, 24GB RAM, free forever) running all services
via Docker Compose. One thing to manage instead of eight separate services.
Requires a credit card for Oracle signup (card never charged on Always Free tier).

---

## Author

**Aditya Kumar**
B.Tech CSE — IIIT Ranchi (2028) · CGPA 9.09
Competitive Programming Coordinator — mentoring 50+ students in DSA
ATF 2025 National Finalist — Top 0.1% of 250,000+ applicants
CodeChef 3★ (max rating 1621 · Global Rank 125, Starters 211)
Codeforces Specialist · 500+ problems solved

[![GitHub](https://img.shields.io/badge/GitHub-adityasinghsss998--spec-181717?style=flat&logo=github)](https://github.com/adityasinghsss998-spec)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat&logo=linkedin)](https://linkedin.com/in/yourprofile)

---

<div align="center">

**Every architectural decision in this project has a documented reason.**
**The system is designed to be extended — not rewritten.**

</div>
READMEEOF
echo "README.md written"
