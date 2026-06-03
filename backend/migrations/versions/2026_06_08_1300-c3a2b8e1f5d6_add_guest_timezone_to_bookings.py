"""add guest_timezone to bookings

Таймзона гостя (IANA), чтобы письма гостю показывали его локальное время.

Revision ID: c3a2b8e1f5d6
Revises: b2f1a7c9d4e3
Create Date: 2026-06-08 13:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c3a2b8e1f5d6"
down_revision: Union[str, Sequence[str], None] = "b2f1a7c9d4e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "bookings", sa.Column("guest_timezone", sa.String(length=64), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("bookings", "guest_timezone")
