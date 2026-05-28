from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _normalize_role(role: str | None) -> str:
    if role == "SUPER_ADMIN":
        return UserRole.SUPER_ADMIN.value
    if role == "RESOURCE_MANAGER":
        return UserRole.RESOURCE_MANAGER.value
    if role == "SCHEDULER":
        return UserRole.SCHEDULER.value
    if role == "LECTURER":
        return UserRole.LECTURER.value
    if role == "STUDENT":
        return UserRole.STUDENT.value
    return role or ""


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = None
    user_id = payload.get("user_id")
    if user_id is not None:
        user = db.query(User).filter(User.user_id == user_id).first()

    if user is None:
        email = payload.get("sub")
        if email:
            user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def require_roles(*allowed_roles: UserRole):
    allowed_values = {role.value for role in allowed_roles}

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if _normalize_role(current_user.role) not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        return current_user

    return role_checker


def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    allowed = {UserRole.SUPER_ADMIN.value}
    if _normalize_role(current_user.role) not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin access required",
        )
    return current_user


def require_admin_or_scheduler(current_user: User = Depends(get_current_user)) -> User:
    """Allows both SuperAdmin and Scheduler roles."""
    allowed = {UserRole.SUPER_ADMIN.value, UserRole.SCHEDULER.value}
    if _normalize_role(current_user.role) not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin or Scheduler access required",
        )
    return current_user


def get_scheduler_faculty_id(current_user: User) -> int | None:
    """
    Returns the faculty_id for Scheduler users.
    Returns None for SuperAdmin (no restriction).
    Raises 403 if a Scheduler has no profile configured.
    """
    role = _normalize_role(current_user.role)
    if role == UserRole.SUPER_ADMIN.value:
        return None  # No filter — sees everything
    if role == UserRole.SCHEDULER.value:
        if not current_user.scheduler_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Scheduler profile not configured. Contact your Super Admin.",
            )
        return current_user.scheduler_profile.faculty_id
    return None
