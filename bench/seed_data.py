"""
High-Performance Synthetic Data Seeder for FlowMetrics Benchmark
Generates synthetic data with fixed random seed and bulk loads into MySQL 8 via LOAD DATA INFILE.
"""

import argparse
from decimal import Decimal, ROUND_HALF_UP
import datetime
import os
import random
import subprocess
import sys
import time
import pymysql

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "benchpass",
    "database": "flowmetrics_bench",
    "autocommit": True,
}

def js_round(seconds: float) -> str:
    """Exact JavaScript Math.round((diff / (1000 * 60 * 60)) * 100) / 100 logic"""
    hours = Decimal(seconds) / Decimal(3600)
    return str(hours.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def format_dt(dt: datetime.datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def generate_tsv_files(n_prs: int, seed: int = 42, out_dir: str = "bench/data"):
    os.makedirs(out_dir, exist_ok=True)
    random.seed(seed)

    pr_file = os.path.join(out_dir, f"pull_requests_{n_prs}.tsv")
    commit_file = os.path.join(out_dir, f"commits_{n_prs}.tsv")
    deploy_file = os.path.join(out_dir, f"deployments_{n_prs}.tsv")

    print(f"Generating synthetic datasets for N={n_prs:,} PRs (seed={seed})...")
    start_time = time.perf_counter()

    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)
    # 90-120 days distribution
    max_days = 120

    merged_prs = []

    with open(pr_file, "w", encoding="utf-8", newline="\n") as f_pr, open(commit_file, "w", encoding="utf-8", newline="\n") as f_cm:
        commit_id = 1
        for i in range(1, n_prs + 1):
            github_pr_id = 1000000 + i
            repo_id = 1
            number = i
            title = f"Bench PR #{i} optimization"
            author_id = 100 + (i % 50)
            author_username = f"dev_{i % 50}"
            
            # 85% merged, 10% open, 5% closed
            r = random.random()
            if r < 0.85:
                state = "merged"
            elif r < 0.95:
                state = "open"
            else:
                state = "closed"

            base_branch = "main"
            head_branch = f"feature/bench-{i}"
            additions = random.randint(5, 800)
            deletions = random.randint(2, 400)
            changed_files = random.randint(1, 15)
            commits_count = random.randint(2, 6)
            review_comments_count = random.randint(0, 5)

            # opened_at between now-110d and now-1h
            open_offset_sec = random.randint(3600, max_days * 86400)
            pr_opened_at = now - datetime.timedelta(seconds=open_offset_sec)
            first_review_at = pr_opened_at + datetime.timedelta(seconds=random.randint(600, 14400))

            if state == "merged":
                cycle_hours_raw = random.uniform(1.0, 144.0) # 1h to 6d
                pr_merged_at = pr_opened_at + datetime.timedelta(seconds=int(cycle_hours_raw * 3600))
                if pr_merged_at > now:
                    pr_merged_at = now
                cycle_time_hours = js_round((pr_merged_at - pr_opened_at).total_seconds())

                lead_offset_sec = random.randint(1800, 86400) # first commit 30m-24h before open
                first_commit_at = pr_opened_at - datetime.timedelta(seconds=lead_offset_sec)
                lead_time_hours = js_round((pr_merged_at - first_commit_at).total_seconds())
                pr_closed_at = "\\N"
                merged_prs.append((i, pr_merged_at))
            elif state == "closed":
                close_offset = random.randint(3600, 72000)
                pr_merged_at = "\\N"
                cycle_time_hours = "\\N"
                lead_time_hours = "\\N"
                first_commit_at = pr_opened_at - datetime.timedelta(seconds=random.randint(1800, 86400))
                pr_closed_at = format_dt(pr_opened_at + datetime.timedelta(seconds=close_offset))
            else: # open
                pr_merged_at = "\\N"
                cycle_time_hours = "\\N"
                lead_time_hours = "\\N"
                first_commit_at = pr_opened_at - datetime.timedelta(seconds=random.randint(1800, 86400))
                pr_closed_at = "\\N"

            pr_merged_str = format_dt(pr_merged_at) if state == "merged" else "\\N"
            pr_opened_str = format_dt(pr_opened_at)
            first_rev_str = format_dt(first_review_at)

            # PR line: id, github_pr_id, repo_id, number, title, author_github_id, author_username, state, base_branch, head_branch, additions, deletions, changed_files, commits_count, review_comments_count, cycle_time_hours, lead_time_hours, first_review_at, pr_opened_at, pr_merged_at, pr_closed_at
            f_pr.write(f"{i}\t{github_pr_id}\t{repo_id}\t{number}\t{title}\t{author_id}\t{author_username}\t{state}\t{base_branch}\t{head_branch}\t{additions}\t{deletions}\t{changed_files}\t{commits_count}\t{review_comments_count}\t{cycle_time_hours}\t{lead_time_hours}\t{first_rev_str}\t{pr_opened_str}\t{pr_merged_str}\t{pr_closed_at}\n")

            # Commits: commit 0 is first_commit_at
            f_cm.write(f"{commit_id}\t{i:08x}0000{author_id:04x}abcdef0123456789abcdef\t{repo_id}\t{i}\t{author_id}\t{author_username}\tinitial commit\t{additions}\t0\t{format_dt(first_commit_at)}\n")
            commit_id += 1

            for c in range(1, commits_count):
                c_time = pr_opened_at + datetime.timedelta(seconds=c * 1800)
                f_cm.write(f"{commit_id}\t{i:08x}{c:04x}{author_id:04x}abcdef0123456789abcdef\t{repo_id}\t{i}\t{author_id}\t{author_username}\tfix commit {c}\t{random.randint(1, 50)}\t{random.randint(0, 20)}\t{format_dt(c_time)}\n")
                commit_id += 1

    # Deployments: realistic ~1 deployment per 4 merged PRs
    with open(deploy_file, "w", encoding="utf-8", newline="\n") as f_dp:
        dep_id = 1
        merged_prs.sort(key=lambda x: x[1])
        batch_size = 4
        for idx in range(0, len(merged_prs), batch_size):
            batch = merged_prs[idx : idx + batch_size]
            dep_time = batch[-1][1] + datetime.timedelta(minutes=random.randint(5, 60))
            if dep_time > now:
                dep_time = now
            duration_min = round(random.uniform(3.0, 25.0), 2)
            completed_time = dep_time + datetime.timedelta(minutes=duration_min)
            status = "success" if random.random() < 0.90 else "failure"
            lead_time_h = round(random.uniform(2.0, 72.0), 2)

            sha_40 = f"d{dep_id:07x}abcdef0123456789abcdef012345678"
            f_dp.write(f"{dep_id}\t{8000000 + dep_id}\t1\tproduction\t{status}\t{sha_40}\tdeploy_bot\t{lead_time_h}\t{format_dt(dep_time)}\t{format_dt(completed_time)}\t{duration_min}\n")
            dep_id += 1

    gen_time = time.perf_counter() - start_time
    print(f"Data generation complete in {gen_time:.2f}s:")
    print(f"  PRs:        {n_prs:,} -> {pr_file}")
    print(f"  Commits:    {commit_id - 1:,} -> {commit_file}")
    print(f"  Deployments:{dep_id - 1:,} -> {deploy_file}")

    return pr_file, commit_file, deploy_file

def load_data_into_mysql(pr_file: str, commit_file: str, deploy_file: str, container_name: str = "flowmetrics-bench-mysql"):
    print("Transferring TSV files into Docker container /var/lib/mysql-files/ ...")
    t0 = time.perf_counter()

    for path in [pr_file, commit_file, deploy_file]:
        basename = os.path.basename(path)
        subprocess.run(
            ["docker", "cp", path, f"{container_name}:/var/lib/mysql-files/{basename}"],
            check=True
        )

    t_cp = time.perf_counter() - t0
    print(f"File copy to container completed in {t_cp:.2f}s.")

    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("Disabling foreign key checks and truncating tables...")
    cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cur.execute("TRUNCATE TABLE commits;")
    cur.execute("TRUNCATE TABLE deployments;")
    cur.execute("TRUNCATE TABLE pr_reviews;")
    cur.execute("TRUNCATE TABLE pull_requests;")
    cur.execute("TRUNCATE TABLE repositories;")

    cur.execute("""
        INSERT INTO repositories (id, github_repo_id, org_id, owner_id, name, full_name)
        VALUES (1, 999001, 1, 1, 'bench_repo', 'bench_org/bench_repo');
    """)

    pr_base = os.path.basename(pr_file)
    cm_base = os.path.basename(commit_file)
    dp_base = os.path.basename(deploy_file)

    print(f"Bulk loading pull_requests ({pr_base})...")
    t_pr = time.perf_counter()
    cur.execute(f"""
        LOAD DATA INFILE '/var/lib/mysql-files/{pr_base}'
        INTO TABLE pull_requests
        FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n'
        (id, github_pr_id, repo_id, number, title, author_github_id, author_username, state,
         base_branch, head_branch, additions, deletions, changed_files, commits_count,
         review_comments_count, cycle_time_hours, lead_time_hours, first_review_at,
         pr_opened_at, pr_merged_at, pr_closed_at);
    """)
    print(f"pull_requests loaded in {time.perf_counter() - t_pr:.2f}s.")

    print(f"Bulk loading commits ({cm_base})...")
    t_cm = time.perf_counter()
    cur.execute(f"""
        LOAD DATA INFILE '/var/lib/mysql-files/{cm_base}'
        INTO TABLE commits
        FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n'
        (id, sha, repo_id, pr_id, author_github_id, author_username, message, additions, deletions, committed_at);
    """)
    print(f"commits loaded in {time.perf_counter() - t_cm:.2f}s.")

    print(f"Bulk loading deployments ({dp_base})...")
    t_dp = time.perf_counter()
    cur.execute(f"""
        LOAD DATA INFILE '/var/lib/mysql-files/{dp_base}'
        INTO TABLE deployments
        FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n'
        (id, github_deployment_id, repo_id, environment, status, sha, deployed_by_username,
         lead_time_hours, deployed_at, completed_at, build_duration_minutes);
    """)
    print(f"deployments loaded in {time.perf_counter() - t_dp:.2f}s.")

    cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.close()
    print("Database seeding successfully verified and completed!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed MySQL with synthetic DORA data")
    parser.add_argument("--size", type=str, default="10k", choices=["10k", "100k", "1M"], help="Dataset size (10k, 100k, 1M)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    size_map = {"10k": 10_000, "100k": 100_000, "1M": 1_000_000}
    n = size_map[args.size]

    pr_f, cm_f, dp_f = generate_tsv_files(n, seed=args.seed)
    load_data_into_mysql(pr_f, cm_f, dp_f)
