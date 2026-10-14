"""Version 003: + verification_status

Revision ID: 003_add_verification_status
Revises: 002_add_gst_number
Create Date: 2026-10-02 20:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_add_verification_status'
down_revision: Union[str, None] = '002_add_gst_number'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('businesses', sa.Column('verification_status', sa.String(length=50), server_default='DRAFT', nullable=False))

def downgrade() -> None:
    op.drop_column('businesses', 'verification_status')
