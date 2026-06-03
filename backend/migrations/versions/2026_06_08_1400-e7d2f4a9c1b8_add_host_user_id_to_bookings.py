"""add host_user_id to bookings

Прямая ссылка на хоста (владельца события), чтобы история хоста переживала
удаление типа встречи. Поле NOT NULL; при удалении пользователя его брони
удаляются каскадом.

Revision ID: e7d2f4a9c1b8
Revises: c3a2b8e1f5d6
Create Date: 2026-06-08 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e7d2f4a9c1b8"
down_revision: Union[str, Sequence[str], None] = "c3a2b8e1f5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "bookings", sa.Column("host_user_id", sa.Integer(), nullable=True)
    )
    op.execute(
        """
        UPDATE bookings
        SET host_user_id = event_types.user_id
        FROM event_types
        WHERE bookings.event_type_id = event_types.id
        """
    )
    # осиротевшие брони (тип встречи уже удалён, хоста не восстановить) удаляем
    op.execute("DELETE FROM bookings WHERE host_user_id IS NULL")
    op.alter_column("bookings", "host_user_id", nullable=False)
    op.create_index(
        op.f("ix_bookings_host_user_id"), "bookings", ["host_user_id"]
    )
    op.create_foreign_key(
        "fk_bookings_host_user_id_users",
        "bookings",
        "users",
        ["host_user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_bookings_host_user_id_users", "bookings", type_="foreignkey"
    )
    op.drop_index(op.f("ix_bookings_host_user_id"), table_name="bookings")
    op.drop_column("bookings", "host_user_id")
