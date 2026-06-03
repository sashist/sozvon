from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    model = None

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self):
        query = select(self.model)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_one_or_none(self, **filter_by):
        query = select(self.model).filter_by(**filter_by)
        result = await self.session.execute(query)
        return result.scalars().one_or_none()

    async def get_by_id(self, id: int):
        return await self.session.get(self.model, id)

    async def get_with_lock(self, id: int):
        query = select(self.model).filter_by(id=id).with_for_update()
        result = await self.session.execute(query)
        return result.scalars().first()

    async def add(self, data: BaseModel):
        db_obj = self.model(**data.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def edit(
        self, data: BaseModel, exclude_unset: bool = False, **filter_by
    ) -> bool:
        update_data = data.model_dump(exclude_unset=exclude_unset)
        query = select(self.model).filter_by(**filter_by)
        result = await self.session.execute(query)
        obj = result.scalars().first()
        if obj:
            for key, value in update_data.items():
                setattr(obj, key, value)
            await self.session.flush()
            return True
        return False

    async def delete(self, **filter_by) -> bool:
        query = select(self.model).filter_by(**filter_by)
        result = await self.session.execute(query)
        obj = result.scalars().first()
        if obj:
            await self.session.delete(obj)
            await self.session.flush()
            return True
        return False
