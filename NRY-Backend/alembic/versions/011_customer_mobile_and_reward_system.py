"""Version 011: Customer Mobile App and Customer Reward System Schema
Revision ID: 011_customer_mobile_and_reward_system
Revises: 010_cycle_transition_and_allocations
Create Date: 2026-10-13 23:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '011_customer_mobile_and_reward_system'
down_revision: Union[str, None] = '010_cycle_transition_and_allocations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add Customer-specific audit and tracking columns to network_members
    try:
        with op.batch_alter_table('network_members') as batch_op:
            batch_op.add_column(sa.Column('has_valid_customer_referral', sa.Boolean(), server_default='0', nullable=False))
            batch_op.add_column(sa.Column('reward_eligibility_timestamp', sa.DateTime(), nullable=True))
    except Exception:
        pass

    # 2. Add customer referral snapshot code to users
    try:
        with op.batch_alter_table('users') as batch_op:
            batch_op.add_column(sa.Column('customer_referral_code', sa.String(length=50), nullable=True))
    except Exception:
        pass

def downgrade() -> None:
    try:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_column('customer_referral_code')
    except Exception:
        pass

    try:
        with op.batch_alter_table('network_members') as batch_op:
            batch_op.drop_column('reward_eligibility_timestamp')
            batch_op.drop_column('has_valid_customer_referral')
    except Exception:
        pass
