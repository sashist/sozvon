class SozvonHTTPException(Exception):
    detail = "Неожиданная ошибка"

    def __init__(self, *args, **kwargs):
        super().__init__(self.detail, *args, **kwargs)


class ObjectNotFoundException(SozvonHTTPException):
    detail = "Объект не найден"
