"""remove_schedules_refactor_availability

Revision ID: 5be7e20ac148
Revises: 3530de36f3a0
Create Date: 2026-01-28 14:36:49.150097

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5be7e20ac148"
down_revision: Union[str, Sequence[str], None] = "3530de36f3a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Шаг 1: Добавляем новые колонки в availability_rules
    op.add_column('availability_rules', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('availability_rules', sa.Column('event_type_id', sa.Integer(), nullable=True))
    
    # Шаг 2: Мигрируем данные из schedule_id -> user_id
    # Берём user_id из availability_schedules по schedule_id
    op.execute("""
        UPDATE availability_rules ar
        SET user_id = (
            SELECT user_id 
            FROM availability_schedules 
            WHERE id = ar.schedule_id
        )
    """)
    
    # Шаг 3: Делаем user_id NOT NULL (все записи теперь глобальные для пользователей)
    op.alter_column('availability_rules', 'user_id', nullable=False)
    
    # Шаг 4: Создаём FK и индексы для availability_rules
    op.create_foreign_key(
        'fk_availability_rules_user_id', 
        'availability_rules', 
        'users', 
        ['user_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_availability_rules_event_type_id', 
        'availability_rules', 
        'event_types', 
        ['event_type_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # Шаг 5: Удаляем старый FK и индексы
    op.drop_constraint('availability_rules_schedule_id_fkey', 'availability_rules', type_='foreignkey')
    op.drop_index('ix_availability_rules_schedule_day', table_name='availability_rules')
    
    # Шаг 6: Создаём новые индексы
    op.create_index('ix_availability_rules_user_id_day', 'availability_rules', ['user_id', 'day_of_week'])
    op.create_index('ix_availability_rules_event_type_id_day', 'availability_rules', ['event_type_id', 'day_of_week'])
    
    # Шаг 7: Удаляем schedule_id из availability_rules
    op.drop_column('availability_rules', 'schedule_id')
    
    # Шаг 8: Добавляем CHECK constraint (либо глобальный для user, либо для event_type)
    op.create_check_constraint(
        'ck_availability_rules_owner',
        'availability_rules',
        '(user_id IS NOT NULL AND event_type_id IS NULL) OR (user_id IS NULL AND event_type_id IS NOT NULL)'
    )
    
    # Шаг 9: Аналогично для schedule_overrides - добавляем event_type_id
    op.add_column('schedule_overrides', sa.Column('event_type_id', sa.Integer(), nullable=True))
    
    # Шаг 10: Создаём FK для event_type_id в overrides
    op.create_foreign_key(
        'fk_schedule_overrides_event_type_id',
        'schedule_overrides',
        'event_types',
        ['event_type_id'],
        ['id'],
        ondelete='CASCADE'
    )
    
    # Шаг 11: Удаляем старый FK schedule_id из overrides
    op.drop_constraint('schedule_overrides_schedule_id_fkey', 'schedule_overrides', type_='foreignkey')
    
    # Шаг 12: Удаляем schedule_id из overrides
    op.drop_column('schedule_overrides', 'schedule_id')
    
    # Шаг 13: Добавляем CHECK constraint для overrides
    op.create_check_constraint(
        'ck_schedule_overrides_owner',
        'schedule_overrides',
        '(user_id IS NOT NULL AND event_type_id IS NULL) OR (user_id IS NULL AND event_type_id IS NOT NULL)'
    )
    
    # Шаг 14: Удаляем schedule_id из event_types
    op.drop_constraint('event_types_schedule_id_fkey', 'event_types', type_='foreignkey')
    op.drop_column('event_types', 'schedule_id')
    
    # Шаг 15: Удаляем таблицу availability_schedules
    op.drop_table('availability_schedules')


def downgrade() -> None:
    """Downgrade schema."""
    # Восстановить это сложно, т.к. мы теряем структуру schedules
    # В продакшене лучше делать новую миграцию вперёд
    raise NotImplementedError("Downgrade не поддерживается для этой миграции")
