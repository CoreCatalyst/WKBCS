"""Version 001: businesses table

Revision ID: 001_businesses_table
Revises: 237ee22d6bdb
Create Date: 2026-10-02 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_businesses_table'
down_revision: Union[str, None] = '237ee22d6bdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Check if businesses table exists, create if not
    op.create_table(
        'businesses',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=False),
        sa.Column('trade_name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('businesses')
