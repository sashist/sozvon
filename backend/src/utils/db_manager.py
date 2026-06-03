from src.repos.availability_rules import AvailabilityRulesRepository
from src.repos.bookings import BookingsRepository
from src.repos.event_types import EventTypesRepository, EventTypeMembersRepository
from src.repos.schedule_overrides import ScheduleOverridesRepository
from src.repos.teams import TeamsRepository, TeamMembersRepository
from src.repos.users import UsersRepository


class DBManager:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session = self.session_factory()

        self.users = UsersRepository(self.session)
        self.event_types = EventTypesRepository(self.session)
        self.event_type_members = EventTypeMembersRepository(self.session)
        self.rules = AvailabilityRulesRepository(self.session)
        self.overrides = ScheduleOverridesRepository(self.session)
        self.bookings = BookingsRepository(self.session)
        self.teams = TeamsRepository(self.session)
        self.team_members = TeamMembersRepository(self.session)

        return self

    async def __aexit__(self, *args):
        await self.session.rollback()
        await self.session.close()

    async def commit(self):
        """Фиксация текущей транзакции."""
        await self.session.commit()

    async def refresh(self, instance: object) -> None:
        """Обновление атрибутов объекта из БД (для серверных значений)."""
        await self.session.refresh(instance)
