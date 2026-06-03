from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.utils.db_manager import DBManager


class BaseService:
    def __init__(self, db: "DBManager") -> None:
        self.db = db
