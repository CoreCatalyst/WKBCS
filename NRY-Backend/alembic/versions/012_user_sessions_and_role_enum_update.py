"""Version 012: Add UserSession table and update RoleEnum
Revision ID: 012_user_sessions_and_role_enum_update
Revises: 011_customer_mobile_and_reward_system
Create Date: 2026-10-14 03:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '012_user_sessions_and_role_enum_update'
down_revision: Union[str, None] = '011_customer_mobile_and_reward_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if hasattr(bind, 'dialect') and bind.dialect else ""

    # 1. Update PostgreSQL RoleEnum with additional application roles
    if dialect_name == "postgresql":
        new_roles = [
            "CUSTOMER",
            "BUSINESS_OWNER",
            "BUSINESS_STAFF",
            "SUPER_ADMIN",
            "SUPPORT"
        ]
        for role_val in new_roles:
            try:
                op.execute(sa.text(f"ALTER TYPE roleenum ADD VALUE IF NOT EXISTS '{role_val}'"))
            except Exception:
                pass

    # 2. Create user_sessions table
    try:
        op.create_table(
            'user_sessions',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('refresh_token_hash', sa.String(length=255), nullable=False),
            sa.Column('device_info', sa.String(length=255), nullable=True),
            sa.Column('ip_address', sa.String(length=50), nullable=True),
            sa.Column('is_revoked', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
        op.create_index(op.f('ix_user_sessions_refresh_token_hash'), 'user_sessions', ['refresh_token_hash'], unique=False)
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_index(op.f('ix_user_sessions_refresh_token_hash'), table_name='user_sessions')
        op.drop_index(op.f('ix_user_sessions_user_id'), table_name='user_sessions')
        op.drop_table('user_sessions')
    except Exception:
        pass
