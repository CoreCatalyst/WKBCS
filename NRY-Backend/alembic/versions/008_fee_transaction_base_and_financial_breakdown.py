"""Version 008: Explicit platform fee transaction base, discount tracking and financial breakdown
Revision ID: 008_fee_transaction_base_and_financial_breakdown
Revises: 007_versioned_platform_fee_rules
Create Date: 2026-10-03 23:45:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '008_fee_transaction_base_and_financial_breakdown'
down_revision: Union[str, None] = '007_versioned_platform_fee_rules'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Update orders table with explicit transaction base fields
    try:
        with op.batch_alter_table('orders') as batch_op:
            batch_op.add_column(sa.Column('gross_business_value', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('merchant_discount', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('platform_discount', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('eligible_net_business_value', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('platform_fee_base_amount', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('shipping_amount', sa.Float(), server_default='0.0', nullable=False))
    except Exception:
        pass

    # 2. Update settlements table with immutable transaction base snapshot
    try:
        with op.batch_alter_table('settlements') as batch_op:
            batch_op.add_column(sa.Column('eligible_business_value', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('merchant_discount_amount', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('shipping_amount', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('platform_fee_base_amount', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('business_type', sa.String(length=50), nullable=True))
            batch_op.add_column(sa.Column('fee_calculated_at', sa.DateTime(), nullable=True))
    except Exception:
        pass

    # 3. Update refunds table with platform fee reversal tracking
    try:
        with op.batch_alter_table('refunds') as batch_op:
            batch_op.add_column(sa.Column('refunded_eligible_business_value', sa.Float(), server_default='0.0', nullable=False))
            batch_op.add_column(sa.Column('original_platform_fee_rate', sa.Float(), nullable=True))
            batch_op.add_column(sa.Column('platform_fee_reversal_amount', sa.Float(), server_default='0.0', nullable=False))
    except Exception:
        pass

def downgrade() -> None:
    try:
        with op.batch_alter_table('refunds') as batch_op:
            batch_op.drop_column('platform_fee_reversal_amount')
            batch_op.drop_column('original_platform_fee_rate')
            batch_op.drop_column('refunded_eligible_business_value')
    except Exception:
        pass

    try:
        with op.batch_alter_table('settlements') as batch_op:
            batch_op.drop_column('fee_calculated_at')
            batch_op.drop_column('business_type')
            batch_op.drop_column('platform_fee_base_amount')
            batch_op.drop_column('shipping_amount')
            batch_op.drop_column('merchant_discount_amount')
            batch_op.drop_column('eligible_business_value')
    except Exception:
        pass

    try:
        with op.batch_alter_table('orders') as batch_op:
            batch_op.drop_column('shipping_amount')
            batch_op.drop_column('platform_fee_base_amount')
            batch_op.drop_column('eligible_net_business_value')
            batch_op.drop_column('platform_discount')
            batch_op.drop_column('merchant_discount')
            batch_op.drop_column('gross_business_value')
    except Exception:
        pass
