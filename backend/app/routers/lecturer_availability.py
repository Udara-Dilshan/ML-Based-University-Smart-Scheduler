from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.connection import get_db
from ..models.lecturer_availability import LecturerAvailability
from pydantic import BaseModel

router = APIRouter(prefix="/availability", tags=["availability"])

class AvailabilityBase(BaseModel):
    lecturer_id: int
    day_of_week: str
    start_time: str
    end_time: str

class AvailabilityOut(AvailabilityBase):
    avail_id: int
    class Config:
        from_attributes = True

@router.post("/", response_model=AvailabilityOut)
def create_availability(avail: AvailabilityBase, db: Session = Depends(get_db)):
    db_avail = LecturerAvailability(**avail.model_dump())
    db.add(db_avail)
    db.commit()
    db.refresh(db_avail)
    return db_avail

@router.get("/{lecturer_id}", response_model=List[AvailabilityOut])
def get_lecturer_availability(lecturer_id: int, db: Session = Depends(get_db)):
    return db.query(LecturerAvailability).filter(LecturerAvailability.lecturer_id == lecturer_id).all()

@router.delete("/{avail_id}")
def delete_availability(avail_id: int, db: Session = Depends(get_db)):
    db_avail = db.query(LecturerAvailability).filter(LecturerAvailability.avail_id == avail_id).first()
    if not db_avail:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(db_avail)
    db.commit()
    return {"message": "Deleted"}