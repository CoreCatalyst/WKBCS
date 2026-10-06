"""Version 006: + UAID single permanent identity and quarterly account activity rules
Revision ID: 006_add_uaid_and_quarterly_rules
Revises: 005_add_network_referral_reward_system
Create Date: 2026-10-03 02:05:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_add_uaid_and_quarterly_rules'
down_revision: Union[str, None] = '005_add_network_referral_reward_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add account_activity_status and is_reward_eligible to network_members
    try:
        op.add_column('network_members', sa.Column('account_activity_status', sa.String(length=50), server_default='ACTIVE', nullable=False))
    except Exception:
        pass
    try:
        op.add_column('network_members', sa.Column('is_reward_eligible', sa.Boolean(), server_default='1', nullable=False))
    except Exception:
        pass

    # 2. Create uaid_generation_logs table
    try:
        op.create_table(
            'uaid_generation_logs',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), nullable=False, index=True),
            sa.Column('uaid', sa.String(length=50), nullable=True, index=True),
            sa.Column('request_id', sa.String(length=100), nullable=True, index=True),
            sa.Column('registration_status', sa.String(length=50), server_default='COMPLETED', nullable=False),
            sa.Column('kyc_status', sa.String(length=50), server_default='PENDING', nullable=False),
            sa.Column('result', sa.String(length=50), nullable=False),
            sa.Column('notes', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False)
        )
    except Exception:
        pass

    # 3. Create quarterly_account_activities table
    try:
        op.create_table(
            'quarterly_account_activities',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('uaid', sa.String(length=50), nullable=False, index=True),
            sa.Column('calendar_year', sa.Integer(), nullable=False, index=True),
            sa.Column('quarter', sa.String(length=10), nullable=False, index=True),
            sa.Column('required_purchase_count', sa.Integer(), server_default='1', nullable=False),
            sa.Column('qualifying_purchase_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('first_qualifying_purchase_id', sa.String(length=100), nullable=True),
            sa.Column('last_qualifying_purchase_id', sa.String(length=100), nullable=True),
            sa.Column('quarter_status', sa.String(length=50), server_default='PENDING', nullable=False),
            sa.Column('evaluated_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('user_id', 'calendar_year', 'quarter', name='uq_user_year_quarter')
        )
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_table('quarterly_account_activities')
    except Exception:
        pass
    try:
        op.drop_table('uaid_generation_logs')
    except Exception:
        pass
    try:
        op.drop_column('network_members', 'is_reward_eligible')
    except Exception:
        pass
    try:
        op.drop_column('network_members', 'account_activity_status')
    except Exception:
        pass
