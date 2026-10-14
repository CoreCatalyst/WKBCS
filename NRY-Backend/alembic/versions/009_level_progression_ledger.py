"""Version 009: Level progression ledger and minimum transaction qualification architecture
Revision ID: 009_level_progression_ledger
Revises: 008_fee_transaction_base_and_financial_breakdown
Create Date: 2026-10-04 00:20:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '009_level_progression_ledger'
down_revision: Union[str, None] = '008_fee_transaction_base_and_financial_breakdown'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create level_progression_ledgers table for Section 33 Level Qualification
    try:
        op.create_table(
            'level_progression_ledgers',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('member_id', sa.String(length=36), nullable=True),
            sa.Column('uaid', sa.String(length=50), nullable=False, index=True),
            sa.Column('cycle_number', sa.Integer(), server_default='1', nullable=False),
            sa.Column('business_type', sa.String(length=50), nullable=False),
            sa.Column('level_number', sa.Integer(), nullable=False, index=True),
            sa.Column('previous_level', sa.Integer(), server_default='0', nullable=False),
            sa.Column('new_level', sa.Integer(), nullable=False),
            sa.Column('qualifying_transaction_id', sa.String(length=100), nullable=True, index=True),
            sa.Column('qualifying_network_volume', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('minimum_required_amount', sa.Float(), nullable=False),
            sa.Column('qualified_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('remaining_unapplied_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('rule_id', sa.String(length=50), nullable=True),
            sa.Column('rule_version', sa.String(length=50), server_default='v1.0', nullable=False),
            sa.Column('event_type', sa.String(length=50), server_default='LEVEL_COMPLETED', nullable=False),
            sa.Column('status', sa.String(length=50), server_default='VERIFIED', nullable=False),
            sa.Column('event_timestamp', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('user_id', 'cycle_number', 'level_number', 'event_type', name='uq_user_cycle_level_event')
        )
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_table('level_progression_ledgers')
    except Exception:
        pass
