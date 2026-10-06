"""Version 005: + network referral reward system
Revision ID: 005_add_network_referral_reward_system
Revises: 004_add_business_category
Create Date: 2026-10-03 01:45:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005_add_network_referral_reward_system'
down_revision: Union[str, None] = '004_add_business_category'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add business_type to network_members
    try:
        op.add_column('network_members', sa.Column('business_type', sa.String(length=50), server_default='WHOLESALER', nullable=False))
    except Exception:
        pass

    # 2. Create reward_rules table
    try:
        op.create_table(
            'reward_rules',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('business_type', sa.String(length=50), nullable=False, index=True),
            sa.Column('rank_number', sa.Integer(), nullable=False, index=True),
            sa.Column('rank_name', sa.String(length=50), nullable=False),
            sa.Column('start_level', sa.Integer(), nullable=False),
            sa.Column('end_level', sa.Integer(), nullable=False),
            sa.Column('completion_level', sa.Integer(), nullable=False),
            sa.Column('minimum_transaction_unit', sa.Float(), nullable=False),
            sa.Column('qualification_multiplier', sa.Integer(), nullable=False),
            sa.Column('reward_rate', sa.Float(), nullable=False),
            sa.Column('active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False)
        )
    except Exception:
        pass

    # 3. Create reward_ledger table
    try:
        op.create_table(
            'reward_ledger',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('member_id', sa.String(length=36), nullable=True),
            sa.Column('referral_id', sa.String(length=36), nullable=True, index=True),
            sa.Column('transaction_id', sa.String(length=100), nullable=True, index=True),
            sa.Column('cycle_number', sa.Integer(), server_default='1', nullable=False),
            sa.Column('rank_number', sa.Integer(), nullable=False),
            sa.Column('rank_name', sa.String(length=50), nullable=False),
            sa.Column('qualification_level', sa.Integer(), nullable=False),
            sa.Column('business_type', sa.String(length=50), nullable=False),
            sa.Column('gross_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('tax_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('eligible_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('qualification_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('reward_rate', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('reward_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
            sa.Column('reward_type', sa.String(length=50), server_default='RANK_COMPLETION', nullable=False),
            sa.Column('status', sa.String(length=50), server_default='REWARDED', nullable=False),
            sa.Column('reversal_reference', sa.String(length=100), nullable=True),
            sa.Column('verified_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('user_id', 'cycle_number', 'rank_number', 'reward_type', name='uq_user_cycle_rank_reward')
        )
    except Exception:
        pass

    # 4. Create referrals table
    try:
        op.create_table(
            'referrals',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('referrer_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('referrer_uaid', sa.String(length=50), nullable=False, index=True),
            sa.Column('referred_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('referred_uaid', sa.String(length=50), nullable=True),
            sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False)
        )
    except Exception:
        pass

    # 5. Create referral_transactions table
    try:
        op.create_table(
            'referral_transactions',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('referral_id', sa.String(length=36), sa.ForeignKey('referrals.id', ondelete='CASCADE'), nullable=True, index=True),
            sa.Column('referrer_user_id', sa.String(length=36), nullable=False, index=True),
            sa.Column('buyer_user_id', sa.String(length=36), nullable=False, index=True),
            sa.Column('order_id', sa.String(length=100), nullable=True, index=True),
            sa.Column('gross_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('tax_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('eligible_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('is_self_purchase', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('is_referral_purchase', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('status', sa.String(length=50), server_default='COMPLETED', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False)
        )
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_table('referral_transactions')
    except Exception:
        pass
    try:
        op.drop_table('referrals')
    except Exception:
        pass
    try:
        op.drop_table('reward_ledger')
    except Exception:
        pass
    try:
        op.drop_table('reward_rules')
    except Exception:
        pass
    try:
        op.drop_column('network_members', 'business_type')
    except Exception:
        pass
