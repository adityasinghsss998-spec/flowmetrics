"""
FlowMetrics Benchmark Suite: Part A - Controlled MySQL 8 Query Benchmark
Executes warm-ups, 200+ timed runs, captures EXPLAIN ANALYZE, and computes exact p50/p95/p99 and speedup ratio Z.
"""

import argparse
import json
import os
import statistics
import time
from typing import Dict, List, Any
import pymysql

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "benchpass",
    "database": "flowmetrics_bench",
    "autocommit": True,
}

# 1. Core Summary Query (DORA Lead Time & Cycle Time)
PRECOMPUTED_SUMMARY_SQL = """
SELECT
    COUNT(*) as total_prs,
    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_time_hours,
    MIN(lead_time_hours) as min_lead_time_hours,
    MAX(lead_time_hours) as max_lead_time_hours,
    COUNT(CASE WHEN lead_time_hours IS NOT NULL THEN 1 END) as prs_with_lead_time,
    COUNT(CASE WHEN lead_time_hours IS NULL THEN 1 END) as prs_without_lead_time
FROM pull_requests
WHERE repo_id = 1
AND state = 'merged'
AND pr_merged_at > NOW() - INTERVAL 90 DAY;
"""

NAIVE_SUMMARY_SQL = """
SELECT
    COUNT(*) as total_prs,
    ROUND(AVG(ROUND(TIMESTAMPDIFF(SECOND, c.first_commit_at, pr.pr_merged_at) / 3600.0, 2)), 2) as avg_lead_time_hours,
    ROUND(AVG(ROUND(TIMESTAMPDIFF(SECOND, pr.pr_opened_at, pr.pr_merged_at) / 3600.0, 2)), 2) as avg_cycle_time_hours,
    MIN(ROUND(TIMESTAMPDIFF(SECOND, c.first_commit_at, pr.pr_merged_at) / 3600.0, 2)) as min_lead_time_hours,
    MAX(ROUND(TIMESTAMPDIFF(SECOND, c.first_commit_at, pr.pr_merged_at) / 3600.0, 2)) as max_lead_time_hours,
    COUNT(CASE WHEN c.first_commit_at IS NOT NULL THEN 1 END) as prs_with_lead_time,
    COUNT(CASE WHEN c.first_commit_at IS NULL THEN 1 END) as prs_without_lead_time
FROM pull_requests pr
LEFT JOIN (
    SELECT pr_id, MIN(committed_at) as first_commit_at
    FROM commits
    WHERE repo_id = 1
    GROUP BY pr_id
) c ON c.pr_id = pr.id
WHERE pr.repo_id = 1
AND pr.state = 'merged'
AND pr.pr_merged_at > NOW() - INTERVAL 90 DAY;
"""

# 2. Weekly Trend Query
PRECOMPUTED_TREND_SQL = """
SELECT
    YEARWEEK(pr_merged_at, 1) as year_week,
    DATE(DATE_SUB(pr_merged_at, INTERVAL WEEKDAY(pr_merged_at) DAY)) as week_start,
    COUNT(*) as pr_count,
    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
    ROUND(MIN(cycle_time_hours), 2) as min_cycle_hours,
    ROUND(MAX(cycle_time_hours), 2) as max_cycle_hours,
    COUNT(CASE WHEN lead_time_hours IS NOT NULL THEN 1 END) as prs_with_lead_time
FROM pull_requests
WHERE repo_id = 1
AND state = 'merged'
AND pr_merged_at > NOW() - INTERVAL 90 DAY
AND cycle_time_hours IS NOT NULL
GROUP BY YEARWEEK(pr_merged_at, 1), week_start
ORDER BY year_week ASC;
"""

NAIVE_TREND_SQL = """
SELECT
    YEARWEEK(pr.pr_merged_at, 1) as year_week,
    DATE(DATE_SUB(pr.pr_merged_at, INTERVAL WEEKDAY(pr.pr_merged_at) DAY)) as week_start,
    COUNT(*) as pr_count,
    ROUND(AVG(ROUND(TIMESTAMPDIFF(SECOND, pr.pr_opened_at, pr.pr_merged_at) / 3600.0, 2)), 2) as avg_cycle_hours,
    ROUND(AVG(ROUND(TIMESTAMPDIFF(SECOND, c.first_commit_at, pr.pr_merged_at) / 3600.0, 2)), 2) as avg_lead_time_hours,
    ROUND(MIN(ROUND(TIMESTAMPDIFF(SECOND, pr.pr_opened_at, pr.pr_merged_at) / 3600.0, 2)), 2) as min_cycle_hours,
    ROUND(MAX(ROUND(TIMESTAMPDIFF(SECOND, pr.pr_opened_at, pr.pr_merged_at) / 3600.0, 2)), 2) as max_cycle_hours,
    COUNT(CASE WHEN c.first_commit_at IS NOT NULL THEN 1 END) as prs_with_lead_time
FROM pull_requests pr
LEFT JOIN (
    SELECT pr_id, MIN(committed_at) as first_commit_at
    FROM commits
    WHERE repo_id = 1
    GROUP BY pr_id
) c ON c.pr_id = pr.id
WHERE pr.repo_id = 1
AND pr.state = 'merged'
AND pr.pr_merged_at > NOW() - INTERVAL 90 DAY
AND pr.pr_opened_at IS NOT NULL
AND pr.pr_merged_at IS NOT NULL
GROUP BY YEARWEEK(pr.pr_merged_at, 1), week_start
ORDER BY year_week ASC;
"""

def get_percentile(sorted_data: List[float], p: float) -> float:
    k = (len(sorted_data) - 1) * p
    f = int(k)
    c = f + 1
    if c < len(sorted_data):
        return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])
    return sorted_data[f]

def run_explain_analyze(cur, query: str) -> str:
    cur.execute(f"EXPLAIN ANALYZE {query}")
    rows = cur.fetchall()
    return "\n".join(row[0] for row in rows)

def benchmark_single_query(cur, query: str, warmups: int, runs: int, label: str) -> Dict[str, Any]:
    print(f"  [{label}] Running {warmups} warm-up iterations...")
    for _ in range(warmups):
        cur.execute(query)
        _ = cur.fetchall()

    print(f"  [{label}] Executing {runs} timed iterations...")
    latencies_ms = []
    for _ in range(runs):
        t0 = time.perf_counter_ns()
        cur.execute(query)
        _ = cur.fetchall()
        t1 = time.perf_counter_ns()
        latencies_ms.append((t1 - t0) / 1_000_000.0)

    sorted_latencies = sorted(latencies_ms)
    p50 = get_percentile(sorted_latencies, 0.50)
    p90 = get_percentile(sorted_latencies, 0.90)
    p95 = get_percentile(sorted_latencies, 0.95)
    p99 = get_percentile(sorted_latencies, 0.99)
    avg = statistics.mean(latencies_ms)
    std = statistics.stdev(latencies_ms) if len(latencies_ms) > 1 else 0.0

    return {
        "label": label,
        "runs": runs,
        "warmups": warmups,
        "min_ms": round(sorted_latencies[0], 3),
        "max_ms": round(sorted_latencies[-1], 3),
        "mean_ms": round(avg, 3),
        "stddev_ms": round(std, 3),
        "p50_ms": round(p50, 3),
        "p90_ms": round(p90, 3),
        "p95_ms": round(p95, 3),
        "p99_ms": round(p99, 3),
        "raw_samples": latencies_ms,
    }

def run_suite(size_label: str, runs: int = 200, warmups: int = 5):
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM pull_requests;")
    actual_prs = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM commits;")
    actual_commits = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM deployments;")
    actual_deployments = cur.fetchone()[0]

    print("=" * 70)
    print(f"FLOWMETRICS QUERY BENCHMARK: Size={size_label} (PRs={actual_prs:,}, Commits={actual_commits:,}, Deployments={actual_deployments:,})")
    print(f"Config: {warmups} warmups, {runs} timed runs")
    print("=" * 70)

    # 1. Summary Queries
    print("\n>>> Benchmarking DORA Summary Query (Precomputed vs Naive) <<<")
    precomputed_summary = benchmark_single_query(cur, PRECOMPUTED_SUMMARY_SQL, warmups, runs, "Precomputed Summary")
    precomputed_summary_explain = run_explain_analyze(cur, PRECOMPUTED_SUMMARY_SQL)

    naive_summary = benchmark_single_query(cur, NAIVE_SUMMARY_SQL, warmups, runs, "Naive Summary")
    naive_summary_explain = run_explain_analyze(cur, NAIVE_SUMMARY_SQL)

    summary_speedup_p50 = naive_summary["p50_ms"] / precomputed_summary["p50_ms"] if precomputed_summary["p50_ms"] > 0 else 0
    summary_speedup_p95 = naive_summary["p95_ms"] / precomputed_summary["p95_ms"] if precomputed_summary["p95_ms"] > 0 else 0
    summary_speedup_mean = naive_summary["mean_ms"] / precomputed_summary["mean_ms"] if precomputed_summary["mean_ms"] > 0 else 0

    # 2. Trend Queries
    print("\n>>> Benchmarking Cycle Time Trend Query (Precomputed vs Naive) <<<")
    precomputed_trend = benchmark_single_query(cur, PRECOMPUTED_TREND_SQL, warmups, runs, "Precomputed Trend")
    precomputed_trend_explain = run_explain_analyze(cur, PRECOMPUTED_TREND_SQL)

    naive_trend = benchmark_single_query(cur, NAIVE_TREND_SQL, warmups, runs, "Naive Trend")
    naive_trend_explain = run_explain_analyze(cur, NAIVE_TREND_SQL)

    trend_speedup_p50 = naive_trend["p50_ms"] / precomputed_trend["p50_ms"] if precomputed_trend["p50_ms"] > 0 else 0
    trend_speedup_p95 = naive_trend["p95_ms"] / precomputed_trend["p95_ms"] if precomputed_trend["p95_ms"] > 0 else 0

    conn.close()

    result_payload = {
        "size_label": size_label,
        "n_prs": actual_prs,
        "n_commits": actual_commits,
        "n_deployments": actual_deployments,
        "runs": runs,
        "warmups": warmups,
        "summary": {
            "precomputed": precomputed_summary,
            "naive": naive_summary,
            "speedup_p50_Z": round(summary_speedup_p50, 2),
            "speedup_p95_Z": round(summary_speedup_p95, 2),
            "speedup_mean_Z": round(summary_speedup_mean, 2),
            "precomputed_explain": precomputed_summary_explain,
            "naive_explain": naive_summary_explain,
        },
        "trend": {
            "precomputed": precomputed_trend,
            "naive": naive_trend,
            "speedup_p50_Z": round(trend_speedup_p50, 2),
            "speedup_p95_Z": round(trend_speedup_p95, 2),
            "precomputed_explain": precomputed_trend_explain,
            "naive_explain": naive_trend_explain,
        }
    }

    # Save to disk
    os.makedirs("bench/results", exist_ok=True)
    out_file = f"bench/results/results_{size_label}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result_payload, f, indent=2)

    print(f"\n[OK] Results written to {out_file}")

    print("\n" + "=" * 80)
    print(f"BENCHMARK SUMMARY TABLE: N={size_label} ({actual_prs:,} PRs)")
    print("=" * 80)
    print(f"{'Query Pattern':<24} | {'p50 (ms)':<9} | {'p90 (ms)':<9} | {'p95 (ms)':<9} | {'p99 (ms)':<9} | {'Speedup Z (p95)':<15}")
    print("-" * 80)
    print(f"{'Summary (Precomputed)':<24} | {precomputed_summary['p50_ms']:<9} | {precomputed_summary['p90_ms']:<9} | {precomputed_summary['p95_ms']:<9} | {precomputed_summary['p99_ms']:<9} | {'1.00x (baseline)':<15}")
    print(f"{'Summary (Naive)':<24} | {naive_summary['p50_ms']:<9} | {naive_summary['p90_ms']:<9} | {naive_summary['p95_ms']:<9} | {naive_summary['p99_ms']:<9} | {summary_speedup_p95:.2f}x faster")
    print("-" * 80)
    print(f"{'Trend (Precomputed)':<24} | {precomputed_trend['p50_ms']:<9} | {precomputed_trend['p90_ms']:<9} | {precomputed_trend['p95_ms']:<9} | {precomputed_trend['p99_ms']:<9} | {'1.00x (baseline)':<15}")
    print(f"{'Trend (Naive)':<24} | {naive_trend['p50_ms']:<9} | {naive_trend['p90_ms']:<9} | {naive_trend['p95_ms']:<9} | {naive_trend['p99_ms']:<9} | {trend_speedup_p95:.2f}x faster")
    print("=" * 80)

    return result_payload

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run FlowMetrics Query Benchmark")
    parser.add_argument("--size", type=str, default="10k", help="Size label for result file")
    parser.add_argument("--runs", type=int, default=200, help="Number of measured runs (default: 200)")
    parser.add_argument("--warmups", type=int, default=5, help="Number of warm-up runs (default: 5)")
    args = parser.parse_args()

    run_suite(size_label=args.size, runs=args.runs, warmups=args.warmups)

