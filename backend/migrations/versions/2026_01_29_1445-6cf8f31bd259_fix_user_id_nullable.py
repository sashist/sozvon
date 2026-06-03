"""fix_user_id_nullable

Revision ID: 6cf8f31bd259
Revises: 5be7e20ac148
Create Date: 2026-01-29 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '6cf8f31bd259'
down_revision: Union[str, Sequence[str], None] = '5be7e20ac148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('availability_rules', 'user_id', nullable=True)


def downgrade() -> None:
    op.alter_column('availability_rules', 'user_id', nullable=False)
