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


class SchedulerProfileInput(BaseModel):
    faculty_id: int


class UserBase(BaseModel):
    email: str
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    role: str
    contact_number: Optional[str] = Field(default=None, max_length=15)
    profile_image: Optional[str] = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=6)
    is_active: bool = True
    student_profile: Optional[StudentProfileInput] = None
    lecturer_profile: Optional[LecturerProfileInput] = None
    resource_manager_profile: Optional[ResourceManagerProfileInput] = None
    scheduler_profile: Optional[SchedulerProfileInput] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    role: Optional[str] = None
    contact_number: Optional[str] = Field(default=None, max_length=15)
    profile_image: Optional[str] = Field(default=None, max_length=255)
    password: Optional[str] = Field(default=None, min_length=6)
    is_active: Optional[bool] = None
    student_profile: Optional[StudentProfileInput] = None
    lecturer_profile: Optional[LecturerProfileInput] = None
    resource_manager_profile: Optional[ResourceManagerProfileInput] = None
    scheduler_profile: Optional[SchedulerProfileInput] = None


class StudentProfileResponse(BaseModel):
    reg_no: Optional[str] = None
    registration_number: Optional[str] = None
    batch_id: Optional[int] = None
    batch_code: Optional[str] = None
    degree_name: Optional[str] = None
    degree_code: Optional[str] = None
    department_name: Optional[str] = None
    semester_name: Optional[str] = None
    semester_number: Optional[int] = None


class LecturerProfileResponse(BaseModel):
    staff_id: Optional[str] = None
    dept_id: Optional[int] = None
    department_name: Optional[str] = None
    designation: Optional[str] = None


class ResourceManagerProfileResponse(BaseModel):
    assigned_section: Optional[str] = None


class SchedulerProfileResponse(BaseModel):
    faculty_id: Optional[int] = None
    faculty_name: Optional[str] = None


class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    student_profile: Optional[StudentProfileResponse] = None
    lecturer_profile: Optional[LecturerProfileResponse] = None
    resource_manager_profile: Optional[ResourceManagerProfileResponse] = None
    scheduler_profile: Optional[SchedulerProfileResponse] = None

    class Config:
        from_attributes = True


class UserLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class StudentSignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    email: str
    registration_number: str = Field(min_length=1, max_length=50)
    batch_id: int
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)
