# FlowMetrics Benchmark Suite

This directory contains the reproducible benchmark suite for the **FlowMetrics** DORA-metrics platform, measuring query performance, ingestion throughput, and end-to-end latency under controlled and production-mirrored conditions.

---

## 1. Environment & Architecture
- **Host Hardware**: AMD Ryzen 7 7840HS (8 Cores, 16 Threads), 16 GB DDR5 RAM, NVMe SSD.
- **Local Database**: MySQL Community Server 8.0.46 running in a dedicated Docker container (`flowmetrics-bench-mysql`).
- **Production Infrastructure**: Render PaaS (Starter/Standard Web Service tiers for API Gateway, GitHub Service, Dashboard Service, Analytics Service; Cloud MySQL 8; Cloud RabbitMQ; Redis).
- **Schema Parity**: Exactly mirrors production Sequelize models and indexes (`repositories`, `pull_requests`, `commits`, `deployments`, `pr_reviews`).
- **Timing Instruments**: Python `time.perf_counter_ns()` and Node.js `process.hrtime.bigint()` with nanosecond precision.

---

## 2. Directory Layout
```
bench/
├── environment.md          # Full hardware, OS, Docker, and engine specifications
├── schema.sql              # Exact production DDL with indices and foreign keys
├── verify_parity.py        # Mathematical & algorithmic parity verification script
├── seed_data.py            # High-performance synthetic data generator & TSV loader
├── benchmark_queries.py    # Query benchmark runner with EXPLAIN ANALYZE
├── webhook_bench.js        # Webhook ingestion load tester & Socket.io e2e latency suite
├── cleanup.py              # Zero-risk data cleanup script (bench_ prefix only)
├── data/                   # Generated TSV data files (10k, 100k, 1M)
└── results/                # Raw timing JSON results and EXPLAIN plans
    ├── results_10k.json
    ├── results_100k.json
    ├── results_1M.json
    └── webhook_results.json
```

---

## 3. Step-by-Step Execution Guide

### Step 1: Start MySQL 8 Docker Container
```bash
docker run -d --name flowmetrics-bench-mysql \
  -e MYSQL_ROOT_PASSWORD=benchpass \
  -e MYSQL_DATABASE=flowmetrics_bench \
  -p 3307:3306 \
  mysql:8.0
```

### Step 2: Apply Production Schema
```powershell
Get-Content bench/schema.sql | docker exec -i flowmetrics-bench-mysql mysql -u root -pbenchpass
```

### Step 3: Run Parity Verification
Verifies that the write-time precomputed table scan query and the read-time naive (raw commit join) query produce 100% identical outputs on all metrics:
```bash
python bench/verify_parity.py
```

### Step 4: Run Query Performance Benchmarks
```bash
# 10k PRs (~40k commits)
python bench/seed_data.py --size 10k --seed 42
python bench/benchmark_queries.py --size 10k --runs 200 --warmups 5

# 100k PRs (~400k commits)
python bench/seed_data.py --size 100k --seed 42
python bench/benchmark_queries.py --size 100k --runs 200 --warmups 5

# 1M PRs (~4M commits)
python bench/seed_data.py --size 1M --seed 42
python bench/benchmark_queries.py --size 1M --runs 25 --warmups 5
```

### Step 5: Run Production Webhook & Latency Benchmark
Runs security edge cases, baseline network RTT, ramped ingestion (5, 10, 20, 30 req/s), Socket.io end-to-end event correlation, and concurrent burst drain:
```bash
node bench/webhook_bench.js
```

### Step 6: Cleanup Synthetic Data
```bash
# Clean local docker benchmark tables
python bench/cleanup.py --target local

# Clean test-org synthetic data on remote database (only repos prefixed with bench_)
python bench/cleanup.py --target remote --prefix bench_
```

---

## 4. Measured Results Summary Table

| Metric / Scenario | Environment | Dataset / N | Runs | p50 (ms) | p95 (ms) | p99 (ms) | Speedup / Note |
|---|---|---|---|---|---|---|---|
| **Cycle/Lead Time (Precomputed)** | Local Docker MySQL 8 | 10,000 PRs (39,855 commits) | 200 | **7.08 ms** | **7.87 ms** | 10.60 ms | **5.29x faster** vs naive |
| **Cycle/Lead Time (Naive On-the-Fly)** | Local Docker MySQL 8 | 10,000 PRs (39,855 commits) | 200 | 37.62 ms | 41.60 ms | 45.41 ms | Baseline join scan |
| **Cycle/Lead Time (Precomputed)** | Local Docker MySQL 8 | 100,000 PRs (400,203 commits) | 200 | **73.08 ms** | **96.32 ms** | 109.84 ms | **9.00x faster** vs naive |
| **Cycle/Lead Time (Naive On-the-Fly)** | Local Docker MySQL 8 | 100,000 PRs (400,203 commits) | 200 | 731.43 ms | 867.04 ms | 985.46 ms | Temporary table materialization |
| **Cycle/Lead Time (Precomputed)** | Local Docker MySQL 8 | 1,000,000 PRs (3,998,529 commits)| 25 | **2,280.99 ms** | **2,531.58 ms** | 2,789.28 ms | **8.28x faster** (10.52x EXPLAIN) |
| **Cycle/Lead Time (Naive On-the-Fly)** | Local Docker MySQL 8 | 1,000,000 PRs (3,998,529 commits)| 25 | 18,200.26 ms | 20,957.92 ms | 23,286.99 ms | Full table scan + derived table |
| **Production Analytics HTTP API** | Render Standard | Small Realistic (Repo 15, 30d) | 30 | **815.40 ms** | **958.75 ms** | 1,125.84 ms | Includes TLS & cross-continent RTT |
| **Baseline Network RTT** | India -> Render PaaS | HTTP POST (20 samples) | 20 | **140.9 ms** | **249.5 ms** | 322.5 ms | Min: 132.6 ms, Avg: 178.0 ms |
| **Webhook Ingestion (Step 1)** | Production Render | 5 req/s (100 events, 20s) | 100 | 526.9 ms | 693.3 ms | 997.3 ms | 0.00% error rate |
| **Webhook Ingestion (Step 2)** | Production Render | 10 req/s (200 events, 20s) | 200 | 523.2 ms | 643.9 ms | 664.0 ms | 0.00% error rate |
| **Webhook Ingestion (Step 3)** | Production Render | 20 req/s (400 events, 20s) | 400 | **541.8 ms** | **721.2 ms** | **848.7 ms** | **Highest sustained (0% error)** |
| **Webhook Ingestion (Step 4)** | Production Render | 30 req/s (451 sent) | 451 | 1,842.1 ms | 3,175.3 ms | 3,890.1 ms | Auto-aborted (p95 > 2.5s) |
| **Concurrent Burst & Drain** | Production Render | 25 concurrent webhooks | 25 | 4,128.4 ms | 4,565.3 ms | 4,810.2 ms | Drained in 13.6s |

---

## 5. Security & Edge Case Verification
- **Invalid HMAC-SHA256 Signature**: Handled cleanly with `HTTP 401 Unauthorized`. Unauthenticated payloads are rejected immediately before database insertion or queue dispatch.
- **Missing Signature Header**: Handled cleanly with `HTTP 401 Unauthorized`.
- **Malformed JSON Payload**: Handled cleanly with `HTTP 400 Bad Request`.
- **Idempotency**: Repeated webhooks with the same `X-GitHub-Delivery` and entity ID return `HTTP 200 OK` and perform an idempotent `upsert` / `updateStatus` in MySQL without duplicating records.

---

## 6. Resume Placeholders (Filled Exclusively from Measured Data)

### Placeholder 1:
> **"Pre-computed cycle/lead time vs naive query: on 100k synthetic PRs, p95 latency 96 ms vs 867 ms (9.0x faster); on 1M PRs, p95 latency 2.53 s vs 20.96 s (8.3x faster)."**

### Placeholder 2:
> **"Sustained 20 webhook events/sec with p95 webhook-to-dashboard latency of 721 ms, HMAC-SHA256 verified."**

---

## 7. Bottlenecks & Findings

### Limiting Factor 1: Derived Table Materialization in Naive Queries (High Impact / Low Effort)
- **Evidence**: `EXPLAIN ANALYZE` reveals that the naive query performs a full scan over ~4,000,000 `commits` rows and forces a temporary materialized table for `GROUP BY pr_id` taking **19.94s** of execution time.
- **Finding**: Precomputing `cycle_time_hours` and `lead_time_hours` at ingestion time completely eliminates the temporary derived table and hash join, reducing single-execution query time from **19.94s to 1.90s** (10.5x faster).

### Limiting Factor 2: Render Free/Starter CPU Throttling Under Webhook Concurrency (Medium Impact / Medium Effort)
- **Evidence**: Webhook throughput scaled cleanly at 5, 10, and 20 req/s with 0.00% errors and p95 latency under 722 ms. At 30 req/s, single-vCPU execution throttled, driving p95 end-to-end latency to 3,175 ms.
- **Fix**: Upgrading the `github-service` instance from Render Starter (0.1-0.5 shared vCPU) to Standard (1 dedicated vCPU) or scaling horizontally behind the existing Nginx/Express gateway.

### Limiting Factor 3: Webhook Delivery Deduplication at the Gateway/Ingestion Layer (Medium Impact / Low Effort)
- **Evidence**: Duplicate delivery IDs were correctly handled at the database layer via idempotent SQL upserts, but GITHUB-SERVICE still executed DB queries and republished messages to RabbitMQ.
- **Fix**: Introduce a fast Redis idempotency check (`SET NX EX 86400` on `webhook:delivery:${deliveryId}`) in `webhookController.js` to short-circuit duplicate webhook deliveries before database or queue execution.
