"""
User Schemas - Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    SUPER_ADMIN = "SuperAdmin"
    SCHEDULER = "Scheduler"
    LECTURER = "Lecturer"
    STUDENT = "Student"
    RESOURCE_MANAGER = "ResourceManager"


# Base User Schema (common fields)
class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    contact_number: Optional[str] = Field(None, max_length=15)
    profile_image: Optional[str] = None


# Student Signup Schema (public registration)
class StudentSignupRequest(BaseModel):
    """Schema for student self-registration"""
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    registration_number: str = Field(..., min_length=5, max_length=50)
    batch: str = Field(..., min_length=2, max_length=50)
    year: int = Field(..., ge=2000, le=2100)
    password: str = Field(..., min_length=8)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@uwu.ac.lk",
                "first_name": "John",
                "last_name": "Doe",
                "registration_number": "UWU/ICT/21/001",
                "batch": "ICT 21",
                "year": 2021,
                "password": "SecurePass123"
            }
        }
    )


# User Login Schema
class UserLoginRequest(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@uwu.ac.lk",
                "password": "yourpassword"
            }
        }
    )


# User Create Schema (Admin creating users)
class UserCreateRequest(BaseModel):
    """Schema for creating users (Admin only)"""
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    role: UserRole
    password: str = Field(..., min_length=8)
    contact_number: Optional[str] = Field(None, max_length=15)
    profile_image: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "lecturer@uwu.ac.lk",
                "first_name": "Jane",
                "last_name": "Smith",
                "role": "Lecturer",
                "password": "SecurePass123",
                "contact_number": "+94771234567"
            }
        }
    )


# User Update Schema
class UserUpdateRequest(BaseModel):
    """Schema for updating user information"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    contact_number: Optional[str] = Field(None, max_length=15)
    profile_image: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "contact_number": "+94771234567"
            }
        }
    )


# Password Update Schema
class PasswordUpdateRequest(BaseModel):
    """Schema for updating password"""
    current_password: str
    new_password: str = Field(..., min_length=8)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123"
            }
        }
    )


# User Response Schema (what we return)
class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)"""
    user_id: int
    email: str
    first_name: str
    last_name: str
    role: str
    contact_number: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Token Response Schema
class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "user_id": 1,
                    "email": "user@uwu.ac.lk",
                    "first_name": "John",
                    "last_name": "Doe",
                    "role": "Student",
                    "is_active": True
                }
            }
        }
    )


# Success Response Schema
class SuccessResponse(BaseModel):
    """Generic success response"""
    message: str
    data: Optional[dict] = None


# Error Response Schema
class ErrorResponse(BaseModel):
    """Generic error response"""
    detail: str
