"""
Parity Verification Script
Verifies that the pre-computed query and the naive (raw event) query produce IDENTICAL results.
"""

from decimal import Decimal, ROUND_HALF_UP
import datetime
import random
import sys
import pymysql

def js_round_hours(seconds: float) -> Decimal:
    """Exact JavaScript Math.round((diff / (1000 * 60 * 60)) * 100) / 100 logic"""
    hours = Decimal(seconds) / Decimal(3600)
    return hours.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "benchpass",
    "database": "flowmetrics_bench",
    "autocommit": True,
}

def setup_test_data():
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Clean previous
    cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cur.execute("TRUNCATE TABLE commits;")
    cur.execute("TRUNCATE TABLE pull_requests;")
    cur.execute("TRUNCATE TABLE repositories;")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1;")

    cur.execute("""
        INSERT INTO repositories (id, github_repo_id, org_id, owner_id, name, full_name)
        VALUES (1, 999001, 1, 1, 'bench_repo', 'bench_org/bench_repo');
    """)

    # Seed 100 sample PRs with commits
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)
    random.seed(42)

    prs = []
    commits = []
    commit_id = 1

    for pr_num in range(1, 101):
        # Open date within last 60 days
        open_offset_days = random.uniform(2, 60)
        pr_opened_at = now - datetime.timedelta(days=open_offset_days)
        
        # Cycle time between 2 hours and 120 hours
        cycle_hours_raw = random.uniform(2.0, 120.0)
        # Javascript write-time exact calculation:
        # diff ms = round(cycle_hours_raw * 3600) * 1000
        pr_merged_at = pr_opened_at + datetime.timedelta(seconds=int(cycle_hours_raw * 3600))
        
        # In JS:
        # const diff = new Date(mergedAt) - new Date(openedAt);
        # return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
        cycle_time_hours = js_round_hours((pr_merged_at - pr_opened_at).total_seconds())

        # Commits: first commit happens before or at pr_opened_at (lead time)
        num_commits = random.randint(2, 6)
        lead_offset_seconds = random.randint(3600, 72000) # 1h to 20h prior to open
        first_commit_at = pr_opened_at - datetime.timedelta(seconds=lead_offset_seconds)
        lead_time_hours = js_round_hours((pr_merged_at - first_commit_at).total_seconds())

        prs.append((
            pr_num,  # id
            100000 + pr_num, # github_pr_id
            1, # repo_id
            pr_num, # number
            f"PR #{pr_num}",
            101,
            "bench_author",
            "merged",
            "main",
            f"feature/{pr_num}",
            random.randint(10, 500),
            random.randint(5, 200),
            random.randint(1, 10),
            num_commits,
            random.randint(0, 5),
            cycle_time_hours,
            lead_time_hours,
            pr_opened_at + datetime.timedelta(hours=1), # first_review_at
            pr_opened_at,
            pr_merged_at,
            None # pr_closed_at
        ))

        # Commits
        # First commit
        commits.append((
            f"sha_{pr_num}_0",
            1,
            pr_num,
            101,
            "bench_author",
            "first commit",
            first_commit_at
        ))
        # Subsequent commits
        for c_idx in range(1, num_commits):
            c_time = pr_opened_at + datetime.timedelta(seconds=c_idx * 1800)
            commits.append((
                f"sha_{pr_num}_{c_idx}",
                1,
                pr_num,
                101,
                "bench_author",
                f"commit {c_idx}",
                c_time
            ))

    cur.executemany("""
        INSERT INTO pull_requests (
            id, github_pr_id, repo_id, number, title, author_github_id, author_username,
            state, base_branch, head_branch, additions, deletions, changed_files,
            commits_count, review_comments_count, cycle_time_hours, lead_time_hours,
            first_review_at, pr_opened_at, pr_merged_at, pr_closed_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, prs)

    cur.executemany("""
        INSERT INTO commits (sha, repo_id, pr_id, author_github_id, author_username, message, committed_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, commits)

    conn.close()
    print(f"Seeded 100 PRs and {len(commits)} commits for parity test.")

def test_parity():
    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    cur = conn.cursor()

    # Precomputed query (production)
    precomputed_sql = """
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

    # Naive query (raw events read-time aggregation)
    # Note: webhookService.js rounds each PR cycle time and lead time to 2 decimal places before storing.
    # Therefore, read-time calculation applies ROUND(diff, 2) per row to achieve identical arithmetic.
    naive_sql = """
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

    cur.execute(precomputed_sql)
    precomputed_res = cur.fetchone()

    cur.execute(naive_sql)
    naive_res = cur.fetchone()

    conn.close()

    print("\n--- Parity Comparison Results ---")
    print(f"Precomputed Query: {precomputed_res}")
    print(f"Naive Query:       {naive_res}")

    match = True
    for key in precomputed_res:
        val1 = precomputed_res[key]
        val2 = naive_res[key]
        if str(val1) != str(val2):
            print(f"MISMATCH on '{key}': precomputed={val1} ({type(val1)}) vs naive={val2} ({type(val2)})")
            match = False

    if match:
        print("\n>>> SUCCESS: Summary queries return 100% IDENTICAL results! <<<")
    else:
        print("\n>>> FAILURE: Summary queries produce differing results! <<<")
        return 1

    # Check Trend query parity
    trend_precomputed_sql = """
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

    trend_naive_sql = """
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

    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    cur = conn.cursor()
    cur.execute(trend_precomputed_sql)
    t_pre = cur.fetchall()
    cur.execute(trend_naive_sql)
    t_naive = cur.fetchall()
    conn.close()

    if len(t_pre) != len(t_naive):
        print(f"Trend length mismatch: {len(t_pre)} vs {len(t_naive)}")
        return 1

    for idx, (row_p, row_n) in enumerate(zip(t_pre, t_naive)):
        for k in row_p:
            if str(row_p[k]) != str(row_n[k]):
                print(f"Trend row {idx} mismatch on {k}: {row_p[k]} vs {row_n[k]}")
                return 1

    print(f"\n>>> SUCCESS: Trend queries match 100% across all {len(t_pre)} weekly buckets! <<<")
    return 0

if __name__ == "__main__":
    setup_test_data()
    sys.exit(test_parity())
