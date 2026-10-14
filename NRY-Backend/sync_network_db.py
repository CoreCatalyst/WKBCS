import asyncio
import sqlite3
import os
from app.core.database import engine, Base
import app.models

def migrate_sqlite():
    db_path = "noryvanta.db"
    if os.path.exists(db_path):
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("PRAGMA table_info(users)")
        u_cols = [c[1] for c in cur.fetchall()]
        if "uaid" not in u_cols:
            print("Adding uaid to users...")
            cur.execute("ALTER TABLE users ADD COLUMN uaid VARCHAR(30)")
            con.commit()

        cur.execute("PRAGMA table_info(network_members)")
        cols = [c[1] for c in cur.fetchall()]
        if "business_type" not in cols:
            print("Adding business_type column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN business_type VARCHAR(50) DEFAULT 'WHOLESALER'")
            con.commit()
        if "account_activity_status" not in cols:
            print("Adding account_activity_status column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN account_activity_status VARCHAR(50) DEFAULT 'ACTIVE'")
            con.commit()
        if "is_reward_eligible" not in cols:
            print("Adding is_reward_eligible column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN is_reward_eligible BOOLEAN DEFAULT 1")
            con.commit()
        if "current_warning_stage" not in cols:
            print("Adding current_warning_stage column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN current_warning_stage VARCHAR(50) DEFAULT 'NONE'")
            con.commit()
        if "grace_period_end_date" not in cols:
            print("Adding grace_period_end_date column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN grace_period_end_date DATETIME")
            con.commit()
        if "final_notice_end_date" not in cols:
            print("Adding final_notice_end_date column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN final_notice_end_date DATETIME")
            con.commit()
        if "last_warning_sent_at" not in cols:
            print("Adding last_warning_sent_at column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN last_warning_sent_at DATETIME")
            con.commit()
        if "last_warning_message" not in cols:
            print("Adding last_warning_message column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN last_warning_message VARCHAR(500)")
            con.commit()
        if "missed_quarter_count" not in cols:
            print("Adding missed_quarter_count column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN missed_quarter_count INTEGER DEFAULT 0")
            con.commit()
        if "total_block_events" not in cols:
            print("Adding total_block_events column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN total_block_events INTEGER DEFAULT 0")
            con.commit()
        if "total_reactivations" not in cols:
            print("Adding total_reactivations column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN total_reactivations INTEGER DEFAULT 0")
            con.commit()
        if "last_reactivation_date" not in cols:
            print("Adding last_reactivation_date column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN last_reactivation_date DATETIME")
            con.commit()
        if "unused_carry_forward_amount" not in cols:
            print("Adding unused_carry_forward_amount column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN unused_carry_forward_amount FLOAT DEFAULT 0.0")
            con.commit()
        if "qualifying_volume_current_cycle" not in cols:
            print("Adding qualifying_volume_current_cycle column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN qualifying_volume_current_cycle FLOAT DEFAULT 0.0")
            con.commit()
        if "kyc_verified" not in cols:
            print("Adding kyc_verified column to network_members...")
            cur.execute("ALTER TABLE network_members ADD COLUMN kyc_verified BOOLEAN DEFAULT 1")
            con.commit()

        # Check network_cycles
        cur.execute("PRAGMA table_info(network_cycles)")
        c_cols = [c[1] for c in cur.fetchall()]
        if "carry_forward_in" not in c_cols:
            print("Adding carry_forward_in to network_cycles...")
            cur.execute("ALTER TABLE network_cycles ADD COLUMN carry_forward_in FLOAT DEFAULT 0.0")
            con.commit()
        if "carry_forward_out" not in c_cols:
            print("Adding carry_forward_out to network_cycles...")
            cur.execute("ALTER TABLE network_cycles ADD COLUMN carry_forward_out FLOAT DEFAULT 0.0")
            con.commit()
        if "total_qualifying_volume" not in c_cols:
            print("Adding total_qualifying_volume to network_cycles...")
            cur.execute("ALTER TABLE network_cycles ADD COLUMN total_qualifying_volume FLOAT DEFAULT 0.0")
            con.commit()

        # Check quarterly_account_activities
        cur.execute("PRAGMA table_info(quarterly_account_activities)")
        q_cols = [c[1] for c in cur.fetchall()]
        if "is_cured_during_grace" not in q_cols:
            print("Adding is_cured_during_grace to quarterly_account_activities...")
            cur.execute("ALTER TABLE quarterly_account_activities ADD COLUMN is_cured_during_grace BOOLEAN DEFAULT 0")
            con.commit()
        if "cure_order_id" not in q_cols:
            print("Adding cure_order_id to quarterly_account_activities...")
            cur.execute("ALTER TABLE quarterly_account_activities ADD COLUMN cure_order_id VARCHAR(100)")
            con.commit()
        if "cure_timestamp" not in q_cols:
            print("Adding cure_timestamp to quarterly_account_activities...")
            cur.execute("ALTER TABLE quarterly_account_activities ADD COLUMN cure_timestamp DATETIME")
            con.commit()

        print("SQLite columns verified.")
        con.close()

async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All SQLAlchemy tables synchronized.")

if __name__ == "__main__":
    migrate_sqlite()
    asyncio.run(create_all_tables())
