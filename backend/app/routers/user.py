"""
User Management Router - CRUD operations for user administration
Only accessible by Super Admin
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.profile import Lecturer, Student, ResourceManager
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    SuccessResponse
)
from app.utils.auth import hash_password
from app.utils.dependencies import require_super_admin

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
    dependencies=[Depends(require_super_admin)]  # All endpoints require Super Admin
)


@router.get("", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
def get_all_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db)
):
    """
    Get All Users
    
    ### Description
    Retrieve a list of all users with optional filtering and pagination.
    Only accessible by Super Admin.
    
    ### Query Parameters:
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (max 500)
    - **role**: Filter by user role (SuperAdmin, Scheduler, Lecturer, Student, ResourceManager)
    - **is_active**: Filter by active status (true/false)
    - **search**: Search in name or email
    
    ### Example:
    ```
    GET /api/users?role=Student&is_active=true&limit=50
    GET /api/users?search=john
    ```
    """
    query = db.query(User)
    
    # Apply filters
    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
            )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_pattern)) |
            (User.last_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    return [UserResponse.model_validate(user) for user in users]


@router.get("/count", status_code=status.HTTP_200_OK)
def get_user_count(
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    Get User Count
    
    ### Description
    Get total count of users with optional filtering.
    Useful for pagination.
    """
    query = db.query(User)
    
    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
            )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    
    return {
        "total": total,
        "filters": {
            "role": role,
            "is_active": is_active
        }
    }


@router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get User by ID
    
    ### Description
    Retrieve a specific user by their user_id.
    
    ### Example:
    ```
    GET /api/users/1
    ```
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Create New User
    
    ### Description
    Create a new user account. Only Super Admin can create users.
    This is used for creating staff accounts (Lecturers, Schedulers, Resource Managers).
    Students should use the self-registration endpoint.
    
    ### Creates:
    - User account with specified role
    - Associated profile (Lecturer/ResourceManager) if applicable
    
    ### Validation:
    - Email must be unique
    - Password minimum 8 characters
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        contact_number=user_data.contact_number,
        profile_image=user_data.profile_image,
        is_active=True
    )
    
    db.add(new_user)
    db.flush()  # Flush to get user_id
    
    # Create associated profile based on role
    if user_data.role == UserRole.LECTURER:
        lecturer_profile = Lecturer(
            user_id=new_user.user_id,
            staff_id=f"EMP{new_user.user_id:05d}",  # Generate employee ID
            dept_id=None  # Department can be assigned later
        )
        db.add(lecturer_profile)
    
    elif user_data.role == UserRole.RESOURCE_MANAGER:
        resource_manager_profile = ResourceManager(
            user_id=new_user.user_id,
            assigned_section=None  # Section can be assigned later
        )
        db.add(resource_manager_profile)
    
    # Note: Student profiles are created through signup endpoint
    # SuperAdmin and Scheduler don't need additional profiles
    
    db.commit()
    db.refresh(new_user)
    
    return UserResponse.model_validate(new_user)


@router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update User
    
    ### Description
    Update user information. Super Admin can update any user.
    
    ### Updatable Fields:
    - first_name
    - last_name
    - contact_number
    - profile_image
    - is_active (can deactivate accounts)
    
    ### Note:
    - Email and role cannot be changed
    - Password should be changed through password update endpoint
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Update fields if provided
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Delete User
    
    ### Description
    Permanently delete a user account. This action cannot be undone.
    Super Admin cannot delete their own account.
    
    ### WARNING:
    This will cascade delete all related records:
    - User profile (Lecturer/Student/ResourceManager)
    - Audit logs
    - Related records
    
    ### Recommendation:
    Instead of deleting, consider deactivating the user by setting is_active=false
    """
    # Prevent admin from deleting themselves
    if user_id == current_admin.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Delete user (cascade will handle related records)
    db.delete(user)
    db.commit()
    
    return SuccessResponse(
        message=f"User {user.email} deleted successfully"
    )


@router.patch("/{user_id}/activate", response_model=UserResponse, status_code=status.HTTP_200_OK)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Activate User Account
    
    ### Description
    Activate a deactivated user account.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    user.is_active = True
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/deactivate", response_model=UserResponse, status_code=status.HTTP_200_OK)
def deactivate_user(
    user_id: int,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivate User Account
    
    ### Description
    Deactivate a user account without deleting it. Deactivated users cannot login.
    This is the recommended way to disable access instead of deleting.
    
    Super Admin cannot deactivate their own account.
    """
    # Prevent admin from deactivating themselves
    if user_id == current_admin.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.get("/statistics/overview", status_code=status.HTTP_200_OK)
def get_user_statistics(db: Session = Depends(get_db)):
    """
    Get User Statistics
    
    ### Description
    Get overview statistics of all users in the system.
    Useful for admin dashboard.
    
    ### Returns:
    - Total users
    - Count by role
    - Active vs inactive users
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    inactive_users = db.query(User).filter(User.is_active == False).count()
    
    # Count by role
    role_counts = {}
    for role in UserRole:
        count = db.query(User).filter(User.role == role).count()
        role_counts[role.value] = count
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "by_role": role_counts
    }
