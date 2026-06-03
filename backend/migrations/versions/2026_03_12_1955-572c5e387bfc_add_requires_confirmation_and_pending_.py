"""add_requires_confirmation_and_pending_status

Revision ID: 572c5e387bfc
Revises: 516b6e950818
Create Date: 2026-03-12 19:55:02.804982

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "572c5e387bfc"
down_revision: Union[str, Sequence[str], None] = "516b6e950818"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Добавить поле requires_confirmation в event_types
    op.add_column(
        "event_types",
        sa.Column(
            "requires_confirmation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # 2. Partial unique index — один email не может дважды забронировать один слот
    #    Учитываем и pending, и confirmed бронирования
    op.create_index(
        "uq_booking_slot_email",
        "bookings",
        ["event_type_id", "start_time", "guest_email"],
        unique=True,
        postgresql_where=sa.text("status IN ('confirmed', 'pending')"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_booking_slot_email", table_name="bookings")
    op.drop_column("event_types", "requires_confirmation")
