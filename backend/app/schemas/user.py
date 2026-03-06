from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime

# 1. Base User Class
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    contact_number: Optional[str] = None
    is_active: bool = True

# 2. For User Creation
class UserCreate(UserBase):
    password: str

# 3. Output Models (Auth.py එකට මේ නම් දෙකම අවශ්‍යයි)
class UserOut(UserBase):
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class UserResponse(UserOut):
    pass

# 4. Auth & Signup Request (Error ආපු ඒවා)
class StudentSignupRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    registration_number: str = Field(..., alias="index_no")
    contact_number: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordUpdateRequest(BaseModel):
    current_password: str = Field(..., alias="old_password")
    new_password: str

# 5. Token & Success Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Any] = None