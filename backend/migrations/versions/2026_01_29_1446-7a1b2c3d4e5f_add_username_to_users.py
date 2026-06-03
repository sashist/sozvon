"""Add username to users

Revision ID: 7a1b2c3d4e5f
Revises: 6cf8f31bd259
Create Date: 2026-01-29

"""
from typing import Sequence
import uuid
import re

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = '7a1b2c3d4e5f'
down_revision: str | None = '6cf8f31bd259'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def generate_username_from_email(email: str) -> str:
    """Генерирует username из email для существующих пользователей."""
    email_part = email.split('@')[0]
    slug = re.sub(r'[^a-z0-9]+', '-', email_part.lower())
    slug = slug.strip('-')
    short_hash = uuid.uuid4().hex[:6]
    return f"{slug}-{short_hash}"


def upgrade() -> None:
    # 1. Добавляем колонку как nullable
    op.add_column('users', sa.Column('username', sa.String(length=50), nullable=True))
    
    # 2. Заполняем существующие записи
    connection = op.get_bind()
    session = Session(bind=connection)
    
    # Получаем всех пользователей без username
    result = connection.execute(sa.text("SELECT id, email FROM users WHERE username IS NULL"))
    for row in result:
        username = generate_username_from_email(row.email)
        connection.execute(
            sa.text("UPDATE users SET username = :username WHERE id = :id"),
            {"username": username, "id": row.id}
        )
    
    # 3. Делаем колонку NOT NULL и добавляем индексы
    op.alter_column('users', 'username', nullable=False)
    op.create_unique_constraint('uq_users_username', 'users', ['username'])
    op.create_index('ix_users_username', 'users', ['username'])


def downgrade() -> None:
    op.drop_index('ix_users_username', table_name='users')
    op.drop_constraint('uq_users_username', 'users', type_='unique')
    op.drop_column('users', 'username')
