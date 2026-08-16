"""认证接口：注册 / 登录 / 当前用户 / 修改密码。"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..core.security import create_access_token, hash_password, verify_password
from ..database import get_db
from ..models import User
from ..schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="用户名已存在")
    user = User(
        username=req.username,
        hashed_password=hash_password(req.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(
            user_id=user.id, username=user.username, role=user.role
        ),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return TokenResponse(
        access_token=create_access_token(
            user_id=user.id, username=user.username, role=user.role
        ),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.old_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="旧密码错误")
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "密码修改成功"}
