# FlowMetrics Benchmark Suite

This directory contains the reproducible benchmark suite for the **FlowMetrics** DORA-metrics platform, measuring query performance, ingestion throughput, and end-to-end latency under controlled and production-mirrored conditions.

---

## 1. Environment & Architecture
- **Host Hardware**: AMD Ryzen 7 7840HS (8 Cores, 16 Threads), 16 GB DDR5 RAM, NVMe SSD.
- **Database Engine**: MySQL Community Server 8.0.46 running in a dedicated Docker container (`flowmetrics-bench-mysql`).
- **Schema Parity**: Exactly mirrors production Sequelize models and indexes (`repositories`, `pull_requests`, `commits`, `deployments`, `pr_reviews`).
- **Timing Instrument**: Python `time.perf_counter_ns()` with nanosecond precision.

---

## 2. Directory Layout
```
bench/
├── environment.md          # Full hardware, OS, Docker, and engine specifications
├── schema.sql              # Exact production DDL with indices and foreign keys
├── verify_parity.py        # Mathematical & algorithmic parity verification script
├── seed_data.py            # High-performance synthetic data generator & TSV loader
├── benchmark_queries.py    # 200-run query benchmark runner with EXPLAIN ANALYZE
├── cleanup.py              # Zero-risk data cleanup script (bench_ prefix only)
├── data/                   # Generated TSV data files (10k, 100k, 1M)
└── results/                # Raw timing JSON results and EXPLAIN plans
    ├── results_10k.json
    ├── results_100k.json
    └── results_1M.json
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
Verifies that the precomputed table scan query and the naive (raw commit join) query produce 100% identical outputs on all metrics:
```bash
python bench/verify_parity.py
```

### Step 4: Seed Data and Run Benchmarks
#### 10,000 Synthetic PRs:
```bash
python bench/seed_data.py --size 10k --seed 42
python bench/benchmark_queries.py --size 10k --runs 200 --warmups 5
```

#### 100,000 Synthetic PRs:
```bash
python bench/seed_data.py --size 100k --seed 42
python bench/benchmark_queries.py --size 100k --runs 200 --warmups 5
```

#### 1,000,000 Synthetic PRs:
```bash
python bench/seed_data.py --size 1M --seed 42
python bench/benchmark_queries.py --size 1M --runs 200 --warmups 5
```

### Step 5: Cleanup Synthetic Data
```bash
# Clean local docker benchmark tables
python bench/cleanup.py --target local

# Clean test-org synthetic data on remote database (only repos prefixed with bench_)
python bench/cleanup.py --target remote --prefix bench_
```

