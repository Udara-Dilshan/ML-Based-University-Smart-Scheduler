from pydantic import BaseModel

class FacultyBase(BaseModel):
    name: str
    code: str
    dean: str
    status: str

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(FacultyBase):
    pass

class Faculty(FacultyBase):
    id: int

    class Config:
        from_attributes = True