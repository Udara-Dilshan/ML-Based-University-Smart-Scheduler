"""
Dependencies - FastAPI dependency injection for authentication
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import decode_access_token

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        token: JWT token from Authorization header
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # Get user_id from token
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (wrapper for clarity)
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Current active user
    """
    return current_user


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency to check if user has required role
    
    Args:
        allowed_roles: List of allowed user roles
        
    Returns:
        Dependency function that checks user role
        
    Example:
        @router.get("/admin-only", dependencies=[Depends(require_role([UserRole.SUPER_ADMIN]))])
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[role.value for role in allowed_roles]}"
            )
        return current_user
    
    return role_checker


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require Super Admin role
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Current user if Super Admin
        
    Raises:
        HTTPException: If user is not Super Admin
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Admin privileges required."
        )
    return current_user


def require_admin_or_scheduler(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require Admin or Scheduler role
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Current user if Admin or Scheduler
        
    Raises:
        HTTPException: If user is not Admin or Scheduler
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHEDULER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin or Scheduler privileges required."
        )
    return current_user


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if token is provided, otherwise return None
    Useful for endpoints that work with or without authentication
    
    Args:
        token: Optional JWT token
        db: Database session
        
    Returns:
        User object if authenticated, None otherwise
    """
    if token is None:
        return None
    
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None
