"""
Noryvanta Platform Fee Audit & Snapshot Tool
Generates pre- and post-migration audit snapshots.
"""
import sqlite3
import os
import json
from datetime import datetime, timezone
import subprocess

def run_audit(db_path: str = "noryvanta.db", output_label: str = "pre_migration"):
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found.")
        return None

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

    # 1. Active platform fee rules
    active_fee_rules = []
    if "platform_fee_rules" in tables:
        rules = cur.execute("SELECT * FROM platform_fee_rules WHERE status='ACTIVE' ORDER BY business_type").fetchall()
        for r in rules:
            active_fee_rules.append(dict(r))
    elif "platform_fee_configs" in tables:
        cfgs = cur.execute("SELECT * FROM platform_fee_configs WHERE is_active=1").fetchall()
        for c in cfgs:
            active_fee_rules.append(dict(c))

    # 2. Business types count
    business_types = []
    if "business_profiles" in tables:
        rows = cur.execute("SELECT business_type, count(*) as count FROM business_profiles GROUP BY business_type").fetchall()
        for r in rows:
            business_types.append({"business_type": r["business_type"], "count": r["count"]})

    # 3. Number of historical transactions & fee amounts
    total_tx_count = 0
    total_fee_amount = 0.0
    settlement_rows = []
    if "settlements" in tables:
        res = cur.execute("SELECT count(*) as cnt, sum(platform_fee_amount) as total_fee FROM settlements").fetchone()
        total_tx_count = res["cnt"] or 0
        total_fee_amount = round(float(res["total_fee"] or 0.0), 2)
        sample = cur.execute("SELECT id, order_id, business_id, gross_amount, platform_fee_rate, platform_fee_amount FROM settlements").fetchall()
        for s in sample:
            settlement_rows.append(dict(s))

    # 4. Number of reward ledger records
    reward_records_count = 0
    if "reward_ledger" in tables:
        reward_records_count = cur.execute("SELECT count(*) FROM reward_ledger").fetchone()[0]
    elif "referral_rewards" in tables:
        reward_records_count = cur.execute("SELECT count(*) FROM referral_rewards").fetchone()[0]

    # 5. Reward rate configuration
    reward_rates = [
        {"rank": "Bronze", "rate_percentage": 1.10},
        {"rank": "Silver", "rate_percentage": 1.20},
        {"rank": "Panna", "rate_percentage": 1.30},
        {"rank": "Gold", "rate_percentage": 1.40},
        {"rank": "Platinum", "rate_percentage": 1.50},
        {"rank": "Ruby", "rate_percentage": 1.60},
        {"rank": "Sapphire", "rate_percentage": 1.70},
        {"rank": "Emerald", "rate_percentage": 1.80},
        {"rank": "Diamond", "rate_percentage": 1.90},
        {"rank": "Black Diamond", "rate_percentage": 2.00},
        {"rank": "Mythic", "rate_percentage": 2.10},
        {"rank": "Legendary", "rate_percentage": 2.20},
    ]

    # 6. Current migration version
    migration_version = "None"
    if "alembic_version" in tables:
        ver = cur.execute("SELECT version_num FROM alembic_version").fetchone()
        if ver:
            migration_version = ver[0]

    # 7. Git commit SHA
    commit_sha = "unknown"
    try:
        commit_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        pass

    con.close()

    snapshot = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_file": db_path,
        "output_label": output_label,
        "commit_sha": commit_sha,
        "migration_version": migration_version,
        "active_platform_fee_rules": active_fee_rules,
        "business_types": business_types,
        "historical_transactions_count": total_tx_count,
        "total_historical_platform_fee_amount": total_fee_amount,
        "reward_ledger_records_count": reward_records_count,
        "reward_rate_configuration": reward_rates,
        "settlements_detail": settlement_rows
    }

    out_dir = "audit_reports"
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, f"{output_label}_snapshot.json")
    with open(json_path, "w") as f:
        json.dump(snapshot, f, indent=2, default=str)

    print(f"Snapshot written to {json_path}")
    return snapshot

if __name__ == "__main__":
    import sys
    label = sys.argv[1] if len(sys.argv) > 1 else "pre_migration"
    run_audit(output_label=label)
