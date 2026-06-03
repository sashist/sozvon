"""Add denormalized event_title to bookings; allow event_type_id to be nullable on delete

Revision ID: 877cc1f62557
Revises: 7a1b2c3d4e5f
Create Date: 2026-01-29 15:21:38.018338

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "877cc1f62557"
down_revision: Union[str, Sequence[str], None] = "7a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Добавляем event_title как nullable (временно)
    op.add_column(
        "bookings",
        sa.Column("event_title", sa.String(length=100), nullable=True),
    )

    # 2. Backfill из event_types
    op.execute("""
        UPDATE bookings
        SET event_title = event_types.title
        FROM event_types
        WHERE bookings.event_type_id = event_types.id
    """)

    # 3. Подстрахуем (на случай если будут осиротевшие записи)
    op.execute("""
        UPDATE bookings
        SET event_title = 'Удалённое событие'
        WHERE event_title IS NULL
    """)

    # 4. Делаем NOT NULL
    op.alter_column(
        "bookings", "event_title",
        existing_type=sa.String(length=100),
        nullable=False,
    )

    # 5. event_type_id становится nullable + FK SET NULL
    # (чтобы при честном удалении event_type старые записи не терялись)
    op.alter_column(
        "bookings", "event_type_id", existing_type=sa.INTEGER(), nullable=True
    )
    op.drop_index(
        op.f("uq_booking_slot_email"),
        table_name="bookings",
        postgresql_where="((status)::text = 'confirmed'::text)",
    )
    op.drop_constraint(
        op.f("bookings_event_type_id_fkey"), "bookings", type_="foreignkey"
    )
    op.create_foreign_key(
        None,
        "bookings",
        "event_types",
        ["event_type_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Не связанные с денормализацией изменения, сохранены как были:
    op.alter_column(
        "schedule_overrides",
        "user_id",
        existing_type=sa.INTEGER(),
        nullable=True,
    )
    op.drop_constraint(op.f("uq_users_username"), "users", type_="unique")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.create_index(
        op.f("ix_users_username"), "users", ["username"], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.create_index(
        op.f("ix_users_username"), "users", ["username"], unique=False
    )
    op.create_unique_constraint(
        op.f("uq_users_username"),
        "users",
        ["username"],
        postgresql_nulls_not_distinct=False,
    )
    op.alter_column(
        "schedule_overrides",
        "user_id",
        existing_type=sa.INTEGER(),
        nullable=False,
    )
    op.drop_constraint(None, "bookings", type_="foreignkey")
    op.create_foreign_key(
        op.f("bookings_event_type_id_fkey"),
        "bookings",
        "event_types",
        ["event_type_id"],
        ["id"],
    )
    op.create_index(
        op.f("uq_booking_slot_email"),
        "bookings",
        ["event_type_id", "start_time", "guest_email"],
        unique=True,
        postgresql_where="((status)::text = 'confirmed'::text)",
    )
    op.alter_column(
        "bookings", "event_type_id", existing_type=sa.INTEGER(), nullable=False
    )
    op.drop_column("bookings", "event_title")
