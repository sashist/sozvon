"""drop event_type_id from schedule_overrides

Переопределения расписания теперь всегда принадлежат пользователю
(глобальный уровень). Уровень типа встречи (event_type_id) не использовался
и удаляется вместе с XOR-ограничением владельца.

Revision ID: b2f1a7c9d4e3
Revises: 8d675dfc0113
Create Date: 2026-06-07 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2f1a7c9d4e3"
down_revision: Union[str, Sequence[str], None] = "8d675dfc0113"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Удаляем переопределения уровня типа встречи (у них user_id IS NULL) —
    # они станут невалидными после перевода user_id в NOT NULL.
    op.execute("DELETE FROM schedule_overrides WHERE user_id IS NULL")

    op.drop_constraint("ck_schedule_overrides_owner", "schedule_overrides", type_="check")
    op.drop_constraint(
        "fk_schedule_overrides_event_type_id", "schedule_overrides", type_="foreignkey"
    )
    op.drop_column("schedule_overrides", "event_type_id")
    op.alter_column(
        "schedule_overrides", "user_id", existing_type=sa.INTEGER(), nullable=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "schedule_overrides", "user_id", existing_type=sa.INTEGER(), nullable=True
    )
    op.add_column(
        "schedule_overrides", sa.Column("event_type_id", sa.INTEGER(), nullable=True)
    )
    op.create_foreign_key(
        "fk_schedule_overrides_event_type_id",
        "schedule_overrides",
        "event_types",
        ["event_type_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_check_constraint(
        "ck_schedule_overrides_owner",
        "schedule_overrides",
        "(user_id IS NOT NULL AND event_type_id IS NULL) "
        "OR (user_id IS NULL AND event_type_id IS NOT NULL)",
    )
