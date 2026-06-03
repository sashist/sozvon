"""Репозиторий для команд"""
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.teams import TeamORM, TeamMemberORM
from src.repos.base import BaseRepository

if TYPE_CHECKING:
    from src.models.teams import TeamRole


class TeamsRepository(BaseRepository):
    model = TeamORM

    async def get_by_slug(self, slug: str) -> TeamORM | None:
        """Получить команду по slug"""
        query = select(self.model).filter_by(slug=slug)
        result = await self.session.execute(query)
        return result.scalars().one_or_none()

    async def get_with_members(self, team_id: int) -> TeamORM | None:
        """Получить команду с загруженными участниками и их данными"""
        from src.models.teams import TeamMemberORM
        query = (
            select(self.model)
            .options(
                selectinload(self.model.members).selectinload(TeamMemberORM.user)
            )
            .filter_by(id=team_id)
        )
        result = await self.session.execute(query)
        return result.scalars().one_or_none()

    async def get_user_teams(self, user_id: int) -> list[TeamORM]:
        """Получить все команды пользователя"""
        query = (
            select(self.model)
            .join(TeamMemberORM)
            .filter(TeamMemberORM.user_id == user_id)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def set_invite_token(self, team_id: int, token: str | None) -> TeamORM | None:
        """Установить или сбросить invite_token у команды."""
        team = await self.get_by_id(team_id)
        if not team:
            return None
        team.invite_token = token
        await self.session.flush()
        return team

    async def get_by_invite_token(self, token: str) -> TeamORM | None:
        """Найти команду по invite_token."""
        query = select(self.model).where(self.model.invite_token == token)
        result = await self.session.execute(query)
        return result.scalars().one_or_none()


class TeamMembersRepository(BaseRepository):
    model = TeamMemberORM

    async def get_team_members(self, team_id: int) -> list[TeamMemberORM]:
        """Получить всех участников команды"""
        query = select(self.model).filter_by(team_id=team_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_member(self, team_id: int, user_id: int) -> TeamMemberORM | None:
        """Получить участника команды"""
        query = select(self.model).filter_by(team_id=team_id, user_id=user_id)
        result = await self.session.execute(query)
        return result.scalars().one_or_none()

    async def is_member(self, team_id: int, user_id: int) -> bool:
        """Проверить является ли пользователь участником команды"""
        member = await self.get_member(team_id, user_id)
        return member is not None

    async def remove_member(self, team_id: int, user_id: int) -> bool:
        """Удалить участника из команды"""
        member = await self.get_member(team_id, user_id)
        if member:
            await self.session.delete(member)
            await self.session.flush()
            return True
        return False

    async def add_member(self, team_id: int, user_id: int, role: "TeamRole") -> TeamMemberORM:
        """Добавить участника в команду"""
        member = TeamMemberORM(team_id=team_id, user_id=user_id, role=role)
        self.session.add(member)
        await self.session.flush()
        return member
