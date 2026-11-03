"""
FlowMetrics Benchmark Cleanup Script
Safely deletes ONLY synthetic data tagged with 'bench_' prefix.
NEVER touches production repositories or non-bench records.
"""

import argparse
import sys
import pymysql

def cleanup_local_docker(db_config):
    print("Running cleanup on local Docker benchmark database (flowmetrics_bench)...")
    conn = pymysql.connect(**db_config, autocommit=True)
    cur = conn.cursor()

    cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cur.execute("TRUNCATE TABLE commits;")
    cur.execute("TRUNCATE TABLE deployments;")
    cur.execute("TRUNCATE TABLE pr_reviews;")
    cur.execute("TRUNCATE TABLE pull_requests;")
    cur.execute("TRUNCATE TABLE repositories;")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.close()
    print("[OK] Local Docker benchmark database completely truncated and cleaned.")

def cleanup_tagged_bench_data(db_config, prefix: str = "bench_"):
    """
    Carefully deletes ONLY records associated with repositories starting with `prefix`.
    Never deletes anything else.
    """
    print(f"Connecting to database to clean synthetic data with prefix '{prefix}'...")
    conn = pymysql.connect(**db_config, autocommit=False)
    cur = conn.cursor()

    try:
        cur.execute("SELECT id, full_name FROM repositories WHERE full_name LIKE %s OR name LIKE %s", (f"{prefix}%", f"{prefix}%"))
        bench_repos = cur.fetchall()

        if not bench_repos:
            print(f"No synthetic repositories found matching prefix '{prefix}'. Nothing to delete.")
            conn.close()
            return

        repo_ids = [r[0] for r in bench_repos]
        repo_names = [r[1] for r in bench_repos]
        print(f"Found {len(repo_ids)} synthetic repository/ies: {repo_names}")

        format_strings = ','.join(['%s'] * len(repo_ids))

        # Commits
        cur.execute(f"DELETE FROM commits WHERE repo_id IN ({format_strings})", repo_ids)
        commits_deleted = cur.rowcount

        # Deployments
        cur.execute(f"DELETE FROM deployments WHERE repo_id IN ({format_strings})", repo_ids)
        deployments_deleted = cur.rowcount

        # PR Reviews
        cur.execute(f"DELETE FROM pr_reviews WHERE repo_id IN ({format_strings})", repo_ids)
        reviews_deleted = cur.rowcount

        # Pull Requests
        cur.execute(f"DELETE FROM pull_requests WHERE repo_id IN ({format_strings})", repo_ids)
        prs_deleted = cur.rowcount

        # Repositories
        cur.execute(f"DELETE FROM repositories WHERE id IN ({format_strings})", repo_ids)
        repos_deleted = cur.rowcount

        conn.commit()
        print(f"[OK] Successfully cleaned synthetic data:")
        print(f"  - Repositories: {repos_deleted}")
        print(f"  - Pull Requests: {prs_deleted}")
        print(f"  - Commits: {commits_deleted}")
        print(f"  - Deployments: {deployments_deleted}")
        print(f"  - PR Reviews: {reviews_deleted}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Cleanup failed: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup synthetic benchmark data")
    parser.add_argument("--target", choices=["local", "remote"], default="local", help="Target database ('local' docker or 'remote' cloud)")
    parser.add_argument("--prefix", type=str, default="bench_", help="Synthetic repository prefix (default: bench_)")
    args = parser.parse_args()

    if args.target == "local":
        cleanup_local_docker({
            "host": "127.0.0.1",
            "port": 3307,
            "user": "root",
            "password": "benchpass",
            "database": "flowmetrics_bench",
        })
    else:
        # Load production credentials from env
        import os
        from dotenv import load_dotenv
        load_dotenv("flowmetrics-ai/.env")
        remote_config = {
            "host": os.getenv("DB_HOST"),
            "port": int(os.getenv("DB_PORT", 3306)),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASS"),
            "database": os.getenv("DB_NAME"),
            "ssl": {"ssl": True} if os.getenv("DB_SSL", "false").lower() == "true" else None,
        }
        cleanup_tagged_bench_data(remote_config, prefix=args.prefix)

