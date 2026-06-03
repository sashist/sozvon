from fastapi import APIRouter, HTTPException, Response, status

from src.api.v1.dependencies import DBDep, UserIdDep
from src.schemas.users import ChangePassword, User, UserLogin, UserPatch, UserRegister
from src.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Авторизация и аутентификация"])


@router.post("/register", summary="Регистрация пользователя")
async def register_user(data: UserRegister, db: DBDep):
    try:
        await AuthService(db).register_user(data)
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Пользователь с таким email уже существует"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"status": "OK"}


@router.post("/login", summary="Аутентификация пользователя")
async def login_user(data: UserLogin, response: Response, db: DBDep):
    try:
        access_token = await AuthService(db).login_user(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e) if str(e) else "Неверный email или пароль"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax"
    )
    return {"status": "OK"}


@router.get("/me", summary="Получение информации о текущем пользователе")
async def get_me(user_id: UserIdDep, db: DBDep) -> User:
    user = await AuthService(db).get_user_by_id(user_id)
    if user:
        return user
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Пользователь не найден"
    )


@router.patch("/me", summary="Обновление профиля пользователя")
async def update_me(data: UserPatch, user_id: UserIdDep, db: DBDep) -> User:
    try:
        await db.users.edit(data, exclude_unset=True, id=user_id)
        await db.commit()
        user = await db.users.get_by_id(user_id)
        return User.model_validate(user)
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Этот username уже занят"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )



@router.post("/change-password", summary="Смена пароля")
async def change_password(data: ChangePassword, user_id: UserIdDep, db: DBDep):
    """Меняет пароль текущего авторизованного пользователя."""
    try:
        await AuthService(db).change_password(user_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    return {"status": "OK"}


@router.post("/logout", summary="Выход из аккаунта")
async def logout(response: Response):
    """Удаляет cookie с токеном."""
    response.delete_cookie(key="access_token")
    return {"status": "OK"}
