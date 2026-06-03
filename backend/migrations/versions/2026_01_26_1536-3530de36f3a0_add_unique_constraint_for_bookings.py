"""add unique constraint for bookings

Revision ID: 3530de36f3a0
Revises: 4208ef58303c
Create Date: 2026-01-26 15:36:16.765769

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3530de36f3a0"
down_revision: Union[str, Sequence[str], None] = "4208ef58303c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Partial unique index: один email не может дважды забронировать один и тот же слот
    # WHERE status = 'confirmed' - только для активных бронирований
    op.create_index(
        'uq_booking_slot_email',
        'bookings',
        ['event_type_id', 'start_time', 'guest_email'],
        unique=True,
        postgresql_where=sa.text("status = 'confirmed'")
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_booking_slot_email', table_name='bookings')
