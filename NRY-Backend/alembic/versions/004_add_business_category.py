"""Version 004: + business_category

Revision ID: 004_add_business_category
Revises: 003_add_verification_status
Create Date: 2026-10-02 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_add_business_category'
down_revision: Union[str, None] = '003_add_verification_status'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('businesses', sa.Column('business_category', sa.String(length=100), server_default='General Commerce', nullable=False))

def downgrade() -> None:
    op.drop_column('businesses', 'business_category')
