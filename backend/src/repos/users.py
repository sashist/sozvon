from pydantic import EmailStr
from sqlalchemy import select

from src.models.users import UserORM
from src.repos.base import BaseRepository


class UsersRepository(BaseRepository):
    model = UserORM

    async def get_by_email(self, email: EmailStr):
        query = select(self.model).filter_by(email=email)
        result = await self.session.execute(query)
        return result.scalars().one_or_none()
