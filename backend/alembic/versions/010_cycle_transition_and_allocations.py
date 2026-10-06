"""Version 010: Cycle transition, carry-forward and transaction qualification allocation
Revision ID: 010_cycle_transition_and_allocations
Revises: 009_level_progression_ledger
Create Date: 2026-10-04 00:35:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '010_cycle_transition_and_allocations'
down_revision: Union[str, None] = '009_level_progression_ledger'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create level_qualification_allocations table (Section 35.1)
    try:
        op.create_table(
            'level_qualification_allocations',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('member_id', sa.String(length=36), nullable=True),
            sa.Column('uaid', sa.String(length=50), nullable=False, index=True),
            sa.Column('cycle_number', sa.Integer(), server_default='1', nullable=False),
            sa.Column('transaction_id', sa.String(length=100), nullable=False, index=True),
            sa.Column('business_type', sa.String(length=50), nullable=False),
            sa.Column('transaction_eligible_amount', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('amount_allocated_to_level', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('amount_remaining', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('level_number', sa.Integer(), nullable=False, index=True),
            sa.Column('allocation_status', sa.String(length=50), server_default='ALLOCATED', nullable=False),
            sa.Column('rule_id', sa.String(length=50), nullable=True),
            sa.Column('rule_version', sa.String(length=50), server_default='v1.0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('cycle_number', 'level_number', 'transaction_id', name='uq_cycle_level_tx_alloc')
        )
    except Exception:
        pass

    # 2. Add cycle carry forward columns to network_cycles
    try:
        with op.batch_alter_table('network_cycles') as batch_op:
            batch_op.add_column(sa.Column('carry_forward_in', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('carry_forward_out', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('total_qualifying_volume', sa.Float(), server_default='0.0', nullable=False))
    except Exception:
        pass

    # 3. Add carry forward fields to network_members
    try:
        with op.batch_alter_table('network_members') as batch_op:
            batch_op.add_column(sa.Column('unused_carry_forward_amount', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('qualifying_volume_current_cycle', sa.Float(), server_default='0.0', nullable=False))
    except Exception:
        pass

def downgrade() -> None:
    try:
        with op.batch_alter_table('network_members') as batch_op:
            batch_op.drop_column('qualifying_volume_current_cycle')
            batch_op.drop_column('unused_carry_forward_amount')
    except Exception:
        pass

    try:
        with op.batch_alter_table('network_cycles') as batch_op:
            batch_op.drop_column('total_qualifying_volume')
            batch_op.drop_column('carry_forward_out')
            batch_op.drop_column('carry_forward_in')
    except Exception:
        pass

    try:
        op.drop_table('level_qualification_allocations')
    except Exception:
        pass
