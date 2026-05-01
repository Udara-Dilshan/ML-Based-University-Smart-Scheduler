from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import time
from ..database.connection import get_db
from ..models.timetable import TimetableSession
from pydantic import BaseModel

router = APIRouter(prefix="/timetable", tags=["timetable"])

class SessionBase(BaseModel):
    batch_id: int
    module_id: int
    lecturer_id: int
    resource_id: int
    day_of_week: str
    start_time: time
    end_time: time

class SessionOut(SessionBase):
    session_id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=List[SessionOut])
def get_timetable(db: Session = Depends(get_db)):
    return db.query(TimetableSession).all()