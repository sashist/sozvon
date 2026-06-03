"""Сервис для управления командами"""

import secrets

from fastapi import HTTPException

from src.models.teams import TeamORM, TeamRole
from src.schemas.teams import (
    Team,
    TeamCreate,
    TeamInviteInfo,
    TeamInviteLink,
    TeamMember,
    TeamMemberAdd,
    TeamMemberWithUser,
    TeamWithMembers,
    TeamUpdate,
)
from src.services.base import BaseService
from src.core.config import settings


def make_invite_url(token: str) -> str:
    """Сформировать полную invite-ссылку для команды."""
    return f"{settings.FRONTEND_URL.rstrip('/')}/invite/{token}"


class TeamsService(BaseService):
    """Сервис для работы с командами"""

    async def create(self, data: TeamCreate, owner_id: int) -> Team:
        """Создать команду, добавить владельца и сгенерировать invite-токен."""
        existing = await self.db.teams.get_by_slug(data.slug)
        if existing:
            raise HTTPException(
                status_code=409, detail="Команда с таким slug уже существует"
            )

        team = await self.db.teams.add(data)
        await self.db.team_members.add_member(team.id, owner_id, TeamRole.OWNER)
        token = secrets.token_urlsafe(32)
        team = await self.db.teams.set_invite_token(team.id, token)
        await self.db.commit()
        return Team.model_validate(team)

    async def get_by_id(self, team_id: int) -> Team | None:
        """Получить команду по ID"""
        team = await self.db.teams.get_by_id(team_id)
        if not team:
            return None
        return Team.model_validate(team)

    async def get_with_members(
        self, team_id: int, user_id: int
    ) -> TeamWithMembers | None:
        """Получить команду с участниками (только для участников команды)"""
        is_member = await self.db.team_members.is_member(team_id, user_id)
        if not is_member:
            raise HTTPException(status_code=403, detail="Вы не участник этой команды")

        team = await self.db.teams.get_with_members(team_id)
        if not team:
            return None

        base = Team.model_validate(team)
        members = [TeamMemberWithUser.from_orm_with_user(m) for m in team.members]
        return TeamWithMembers(
            **base.model_dump(),
            invite_token=team.invite_token,
            members=members,
        )

    async def get_user_teams(self, user_id: int) -> list[Team]:
        """Получить все команды пользователя"""
        teams = await self.db.teams.get_user_teams(user_id)
        return [Team.model_validate(t) for t in teams]

    async def add_member(
        self, team_id: int, data: TeamMemberAdd, current_user_id: int
    ) -> TeamMember:
        """Добавить участника в команду"""
        await self._check_admin_rights(team_id, current_user_id)

        user = await self.db.users.get_by_id(data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        if await self.db.team_members.is_member(team_id, data.user_id):
            raise HTTPException(status_code=409, detail="Пользователь уже в команде")

        member = await self.db.team_members.add_member(team_id, data.user_id, data.role)
        await self.db.commit()
        return TeamMember.model_validate(member)

    async def remove_member(
        self, team_id: int, user_id: int, current_user_id: int
    ) -> None:
        """Удалить участника из команды"""
        await self._check_admin_rights(team_id, current_user_id)

        member = await self.db.team_members.get_member(team_id, user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Участник не найден")

        if member.role == TeamRole.OWNER:
            raise HTTPException(
                status_code=400, detail="Нельзя удалить владельца команды"
            )

        await self.db.team_members.remove_member(team_id, user_id)
        await self.db.commit()

    async def update_member_role(
        self, team_id: int, user_id: int, role: TeamRole, current_user_id: int
    ) -> TeamMember:
        """Изменить роль участника"""
        current_member = await self.db.team_members.get_member(team_id, current_user_id)
        if not current_member or current_member.role != TeamRole.OWNER:
            raise HTTPException(
                status_code=403, detail="Только владелец может менять роли"
            )

        member = await self.db.team_members.get_member(team_id, user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Участник не найден")

        if member.role == TeamRole.OWNER:
            raise HTTPException(
                status_code=400, detail="Нельзя изменить роль владельца"
            )

        member.role = role
        await self.db.commit()

        return TeamMember.model_validate(member)

    async def update(
        self, team_id: int, data: TeamUpdate, current_user_id: int
    ) -> Team:
        """Обновить команду"""
        await self._check_admin_rights(team_id, current_user_id)

        team = await self.db.teams.get_by_id(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Команда не найдена")

        if data.slug and data.slug != team.slug:
            existing = await self.db.teams.get_by_slug(data.slug)
            if existing:
                raise HTTPException(
                    status_code=409, detail="Команда с таким slug уже существует"
                )

        await self.db.teams.edit(data, id=team_id, exclude_unset=True)
        await self.db.commit()

        updated_team = await self.db.teams.get_by_id(team_id)
        return Team.model_validate(updated_team)

    async def delete(self, team_id: int, current_user_id: int) -> None:
        """Удалить команду"""
        member = await self.db.team_members.get_member(team_id, current_user_id)
        if not member or member.role != TeamRole.OWNER:
            raise HTTPException(
                status_code=403, detail="Только владелец может удалить команду"
            )

        await self.db.teams.delete(id=team_id)
        await self.db.commit()

    async def _check_admin_rights(self, team_id: int, user_id: int) -> None:
        """Проверить что пользователь admin или owner"""
        member = await self.db.team_members.get_member(team_id, user_id)
        if not member or member.role not in (TeamRole.OWNER, TeamRole.ADMIN):
            raise HTTPException(
                status_code=403, detail="Недостаточно прав для этого действия"
            )

    async def leave_team(self, team_id: int, user_id: int) -> None:
        """Покинуть команду"""
        member = await self.db.team_members.get_member(team_id, user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Вы не участник этой команды")

        if member.role == TeamRole.OWNER:
            raise HTTPException(
                status_code=400,
                detail="Владелец не может покинуть команду. Передайте права или удалите команду.",
            )

        await self.db.team_members.remove_member(team_id, user_id)
        await self.db.commit()

    async def get_invite_token(self, team_id: int, user_id: int) -> TeamInviteLink:
        """Вернуть текущую invite-ссылку команды.

        Доступно только для owner/admin команды.
        """
        await self._check_admin_rights(team_id, user_id)

        team = await self.db.teams.get_by_id(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Команда не найдена")

        return TeamInviteLink(
            token=team.invite_token,
            invite_url=make_invite_url(team.invite_token),
        )

    async def accept_invite(self, token: str, user_id: int) -> TeamORM:
        """Принять приглашение и вступить в команду по токену."""
        team = await self.db.teams.get_by_invite_token(token)
        if not team:
            raise HTTPException(status_code=404, detail="Приглашение не найдено")

        if await self.db.team_members.is_member(team.id, user_id):
            raise HTTPException(status_code=409, detail="Вы уже участник этой команды")

        await self.db.team_members.add_member(team.id, user_id, TeamRole.MEMBER)
        await self.db.commit()

        return team

    async def get_invite_info(self, token: str) -> TeamInviteInfo | None:
        """Получить публичную информацию о команде по токену приглашения."""
        team = await self.db.teams.get_by_invite_token(token)
        if not team:
            return None

        member_count = len(await self.db.team_members.get_team_members(team.id))
        return TeamInviteInfo(
            team_name=team.name,
            team_slug=team.slug,
            team_description=team.description,
            member_count=member_count,
        )
