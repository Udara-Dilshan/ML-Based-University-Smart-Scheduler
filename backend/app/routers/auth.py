"""
Authentication Router - Login, Signup, and User Profile endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.profile import Student
from app.schemas.user import (
    UserLoginRequest,
    StudentSignupRequest,
    TokenResponse,
    UserResponse,
    PasswordUpdateRequest,
    SuccessResponse
)
from app.utils.auth import (
    authenticate_user,
    create_access_token,
    hash_password,
    verify_password
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(
    credentials: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    User Login - Returns JWT token and user data
    
    ### Description
    Authenticate user with email and password. Returns access token for subsequent API calls.
    
    ### Supports all 5 roles:
    - SuperAdmin
    - Scheduler
    - Lecturer
    - Student
    - ResourceManager
    """
    # Authenticate user
    user = authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact administrator."
        )
    
    # Create access token
    access_token = create_access_token(
        data={"user_id": user.user_id, "email": user.email, "role": user.role.value}
    )
    
    # Return token and user data
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def student_signup(
    signup_data: StudentSignupRequest,
    db: Session = Depends(get_db)
):
    """
    Student Self-Registration
    
    ### Description
    Allows students to create their own accounts. Only students can self-register.
    Staff accounts must be created by administrators.
    
    ### Validation:
    - Email must be unique
    - Registration number must be unique
    - Email should be institutional (@uwu.ac.lk)
    - Password minimum 8 characters
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if registration number already exists
    existing_student = db.query(Student).filter(
        Student.reg_no == signup_data.registration_number
    ).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration number already registered"
        )
    
    # Validate email domain (optional but recommended)
    if not signup_data.email.lower().endswith("@uwu.ac.lk"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use your institutional email address (@uwu.ac.lk)"
        )
    
    # Create user account
    new_user = User(
        email=signup_data.email,
        password_hash=hash_password(signup_data.password),
        first_name=signup_data.first_name,
        last_name=signup_data.last_name,
        role=UserRole.STUDENT,
        is_active=True
    )
    
    db.add(new_user)
    db.flush()  # Flush to get user_id
    
    # Create student profile
    # Note: batch_id should be set based on actual batch. For now, we'll set to None
    # You should implement batch lookup logic based on batch name and year
    new_student = Student(
        user_id=new_user.user_id,
        reg_no=signup_data.registration_number,
        batch_id=None  # TODO: Implement batch lookup/creation logic
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_user)
    
    # Create access token for auto-login
    access_token = create_access_token(
        data={"user_id": new_user.user_id, "email": new_user.email, "role": new_user.role.value}
    )
    
    # Return token and user data
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get Current User Profile
    
    ### Description
    Get the profile of the currently authenticated user.
    Requires valid JWT token in Authorization header.
    
    ### Example
    ```
    GET /api/auth/me
    Authorization: Bearer <your_access_token>
    ```
    """
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_profile(
    first_name: str = None,
    last_name: str = None,
    contact_number: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update Current User Profile
    
    ### Description
    Update profile information of the currently authenticated user.
    Users can only update their own profiles.
    
    ### Updatable Fields:
    - first_name
    - last_name
    - contact_number
    """
    # Update fields if provided
    if first_name is not None:
        current_user.first_name = first_name
    if last_name is not None:
        current_user.last_name = last_name
    if contact_number is not None:
        current_user.contact_number = contact_number
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.put("/password", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def change_password(
    password_data: PasswordUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change Password
    
    ### Description
    Change password for the currently authenticated user.
    Requires current password for verification.
    
    ### Security:
    - Current password must be correct
    - New password minimum 8 characters
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = hash_password(password_data.new_password)
    db.commit()
    
    return SuccessResponse(
        message="Password changed successfully"
    )


@router.post("/logout", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout
    
    ### Description
    Logout endpoint. In JWT authentication, actual logout is handled on the client side
    by removing the token. This endpoint is mainly for logging/tracking purposes.
    
    ### Note:
    Client should remove the JWT token from storage after calling this endpoint.
    """
    return SuccessResponse(
        message="Logged out successfully"
    )
