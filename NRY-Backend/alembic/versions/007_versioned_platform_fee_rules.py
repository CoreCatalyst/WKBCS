"""Version 007: Versioned category-based platform fee rules and historical audit tracking
Revision ID: 007_versioned_platform_fee_rules
Revises: 006_add_uaid_and_quarterly_rules
Create Date: 2026-10-03 23:30:00.000000
"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from alembic import op
import sqlalchemy as sa

revision: str = '007_versioned_platform_fee_rules'
down_revision: Union[str, None] = '006_add_uaid_and_quarterly_rules'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Initial Target Platform Fee Configuration
INITIAL_FEE_RULES = [
    {
        "id": "fee-rule-wholesaler-v1",
        "business_type": "WHOLESALER",
        "fee_percentage": Decimal("3.20"),
        "currency_scope": "INR",
        "status": "ACTIVE",
        "version": 1,
        "change_reason": "Statutory category-based platform fee configuration (Wholesaler 3.20%)",
        "created_by": "SYSTEM_MIGRATION_007",
    },
    {
        "id": "fee-rule-distributor-v1",
        "business_type": "DISTRIBUTOR",
        "fee_percentage": Decimal("5.20"),
        "currency_scope": "INR",
        "status": "ACTIVE",
        "version": 1,
        "change_reason": "Statutory category-based platform fee configuration (Distributor 5.20%)",
        "created_by": "SYSTEM_MIGRATION_007",
    },
    {
        "id": "fee-rule-services-v1",
        "business_type": "SERVICES",
        "fee_percentage": Decimal("5.20"),
        "currency_scope": "INR",
        "status": "ACTIVE",
        "version": 1,
        "change_reason": "Statutory category-based platform fee configuration (Services 5.20%)",
        "created_by": "SYSTEM_MIGRATION_007",
    },
    {
        "id": "fee-rule-retailer-v1",
        "business_type": "RETAILER",
        "fee_percentage": Decimal("8.20"),
        "currency_scope": "INR",
        "status": "ACTIVE",
        "version": 1,
        "change_reason": "Statutory category-based platform fee configuration (Retailer 8.20%)",
        "created_by": "SYSTEM_MIGRATION_007",
    },
]

def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create versioned platform_fee_rules table
    try:
        op.create_table(
            'platform_fee_rules',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('business_type', sa.String(length=50), nullable=False, index=True),
            sa.Column('fee_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
            sa.Column('currency_scope', sa.String(length=10), server_default='INR', nullable=False),
            sa.Column('effective_from', sa.DateTime(), nullable=False),
            sa.Column('effective_to', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False, index=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
            sa.Column('change_reason', sa.String(length=255), nullable=True),
            sa.Column('created_by', sa.String(length=36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.CheckConstraint('fee_percentage >= 0 AND fee_percentage <= 100', name='ck_platform_fee_percentage_valid'),
            sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED')", name='ck_platform_fee_status_valid'),
            sa.UniqueConstraint('business_type', 'version', name='uq_fee_rule_biz_version')
        )
    except Exception:
        pass

    # 2. Add immutable audit tracking fields to settlements (batch mode for SQLite / Postgres parity)
    try:
        with op.batch_alter_table('settlements') as batch_op:
            batch_op.add_column(sa.Column('applied_fee_rule_id', sa.String(length=36), nullable=True))
            batch_op.add_column(sa.Column('applied_fee_rule_version', sa.Integer(), nullable=True))
    except Exception:
        pass

    # 3. Seed initial 4 active category fee rules idempotently
    now_utc = datetime.now(timezone.utc)
    platform_fee_rules_table = sa.table(
        'platform_fee_rules',
        sa.column('id', sa.String),
        sa.column('business_type', sa.String),
        sa.column('fee_percentage', sa.Numeric),
        sa.column('currency_scope', sa.String),
        sa.column('effective_from', sa.DateTime),
        sa.column('effective_to', sa.DateTime),
        sa.column('status', sa.String),
        sa.column('version', sa.Integer),
        sa.column('change_reason', sa.String),
        sa.column('created_by', sa.String),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )

    for rule in INITIAL_FEE_RULES:
        # Check if rule already exists to prevent duplicate insertion on re-runs
        existing = conn.execute(
            sa.text("SELECT id FROM platform_fee_rules WHERE business_type = :bt AND version = :v"),
            {"bt": rule["business_type"], "v": rule["version"]}
        ).fetchone()

        if not existing:
            op.bulk_insert(platform_fee_rules_table, [{
                "id": rule["id"],
                "business_type": rule["business_type"],
                "fee_percentage": rule["fee_percentage"],
                "currency_scope": rule["currency_scope"],
                "effective_from": now_utc,
                "effective_to": None,
                "status": rule["status"],
                "version": rule["version"],
                "change_reason": rule["change_reason"],
                "created_by": rule["created_by"],
                "created_at": now_utc,
                "updated_at": now_utc
            }])

def downgrade() -> None:
    # 1. Drop audit columns from settlements (batch mode for SQLite/Postgres parity)
    try:
        with op.batch_alter_table('settlements') as batch_op:
            batch_op.drop_column('applied_fee_rule_version')
            batch_op.drop_column('applied_fee_rule_id')
    except Exception:
        pass

    # 2. Drop platform_fee_rules table
    try:
        op.drop_table('platform_fee_rules')
    except Exception:
        pass
