from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class StudentProfileInput(BaseModel):
    reg_no: str = Field(min_length=1, max_length=50)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    batch_id: Optional[int] = None


class LecturerProfileInput(BaseModel):
    staff_id: str = Field(min_length=1, max_length=50)
    dept_id: Optional[int] = None
    designation: Optional[str] = Field(default=None, max_length=100)


class ResourceManagerProfileInput(BaseModel):
    assigned_section: str = Field(min_length=1, max_length=50)


class UserBase(BaseModel):
    email: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: str
    contact_number: Optional[str] = Field(default=None, max_length=20)
    profile_image: Optional[str] = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=6)
    is_active: bool = True
    student_profile: Optional[StudentProfileInput] = None
    lecturer_profile: Optional[LecturerProfileInput] = None
    resource_manager_profile: Optional[ResourceManagerProfileInput] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    role: Optional[str] = None
    contact_number: Optional[str] = Field(default=None, max_length=20)
    profile_image: Optional[str] = Field(default=None, max_length=255)
    password: Optional[str] = Field(default=None, min_length=6)
    is_active: Optional[bool] = None
    student_profile: Optional[StudentProfileInput] = None
    lecturer_profile: Optional[LecturerProfileInput] = None
    resource_manager_profile: Optional[ResourceManagerProfileInput] = None


class StudentProfileResponse(BaseModel):
    reg_no: Optional[str] = None
    registration_number: Optional[str] = None
    batch_id: Optional[int] = None


class LecturerProfileResponse(BaseModel):
    staff_id: Optional[str] = None
    dept_id: Optional[int] = None
    department_name: Optional[str] = None
    designation: Optional[str] = None


class ResourceManagerProfileResponse(BaseModel):
    assigned_section: Optional[str] = None


class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    student_profile: Optional[StudentProfileResponse] = None
    lecturer_profile: Optional[LecturerProfileResponse] = None
    resource_manager_profile: Optional[ResourceManagerProfileResponse] = None

    class Config:
        from_attributes = True


class UserLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class StudentSignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str
    registration_number: str = Field(min_length=1, max_length=50)
    batch: str = Field(min_length=1, max_length=50)
    year: int
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
