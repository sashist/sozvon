"""API для управления командами"""

from fastapi import APIRouter, HTTPException
from starlette import status

from src.api.v1.dependencies import DBDep, UserIdDep
from src.schemas.teams import TeamCreate, TeamMemberUpdate, TeamUpdate
from src.services.teams import TeamsService, make_invite_url

router = APIRouter(prefix="/teams", tags=["Команды"])


@router.post("")
async def create_team(
    data: TeamCreate,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Создать новую команду. Создатель становится владельцем."""
    team = await TeamsService(db).create(data, user_id)
    team.invite_url = make_invite_url(team.invite_token)
    return {"status": "OK", "data": team}


@router.get("")
async def get_my_teams(
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Получить все команды текущего пользователя"""
    teams = await TeamsService(db).get_user_teams(user_id)
    for team in teams:
        team.invite_url = make_invite_url(team.invite_token)
    return {"status": "OK", "data": teams}


@router.get("/{team_id}")
async def get_team(
    team_id: int,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Получить команду с участниками"""
    team = await TeamsService(db).get_with_members(team_id, user_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Команда не найдена"
        )
    team.invite_url = make_invite_url(team.invite_token)
    return {"status": "OK", "data": team}


@router.patch("/{team_id}")
async def update_team(
    team_id: int,
    data: TeamUpdate,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Обновить команду (имя, slug, описание). Только для владельца и админа."""
    team = await TeamsService(db).update(team_id, data, user_id)
    team.invite_url = make_invite_url(team.invite_token)
    return {"status": "OK", "data": team}


@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Удалить команду. Только для владельца."""
    await TeamsService(db).delete(team_id, user_id)
    return {"status": "OK"}


@router.patch("/{team_id}/members/{member_user_id}")
async def update_member_role(
    team_id: int,
    member_user_id: int,
    data: TeamMemberUpdate,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Изменить роль участника. Только для владельца."""
    member = await TeamsService(db).update_member_role(
        team_id, member_user_id, data.role, user_id
    )
    return {"status": "OK", "data": member}


@router.delete("/{team_id}/members/{member_user_id}")
async def remove_team_member(
    team_id: int,
    member_user_id: int,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Удалить участника из команды. Только для owner/admin."""
    await TeamsService(db).remove_member(team_id, member_user_id, user_id)
    return {"status": "OK"}


@router.post("/{team_id}/leave")
async def leave_team(
    team_id: int,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Покинуть команду"""
    await TeamsService(db).leave_team(team_id, user_id)
    return {"status": "OK"}


@router.get("/{team_id}/invite")
async def get_invite(
    team_id: int,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Получить invite-ссылку команды. Только для owner/admin."""
    link = await TeamsService(db).get_invite_token(team_id, user_id)
    return {"status": "OK", "data": link}


@router.get("/invite/{token}")
async def get_invite_info(
    token: str,
    db: DBDep,
) -> dict:
    """Получить публичную информацию о команде по токену приглашения."""
    info = await TeamsService(db).get_invite_info(token)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Приглашение не найдено",
        )
    return {"status": "OK", "data": info}


@router.post("/join/{token}")
async def accept_invite(
    token: str,
    db: DBDep,
    user_id: UserIdDep,
) -> dict:
    """Вступить в команду по токену приглашения."""
    team = await TeamsService(db).accept_invite(token, user_id)
    return {"status": "OK", "data": {"team_id": team.id, "team_name": team.name}}
