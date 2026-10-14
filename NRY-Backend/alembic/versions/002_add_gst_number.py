"""Version 002: + gst_number

Revision ID: 002_add_gst_number
Revises: 001_businesses_table
Create Date: 2026-10-02 20:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_gst_number'
down_revision: Union[str, None] = '001_businesses_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('businesses', sa.Column('gst_number', sa.String(length=15), nullable=True))

def downgrade() -> None:
    op.drop_column('businesses', 'gst_number')
