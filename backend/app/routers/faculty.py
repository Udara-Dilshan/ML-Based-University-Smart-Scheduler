from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.faculty import Faculty
from app.schemas.faculty import FacultyCreate, FacultyUpdate
from app.utils.db_errors import commit_delete_or_raise

router = APIRouter(prefix="/faculties", tags=["faculties"])

@router.get("/")
def get_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).all()

@router.post("/")
def create_faculty(faculty: FacultyCreate, db: Session = Depends(get_db)):
    new_faculty = Faculty(**faculty.dict())
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    return new_faculty

@router.put("/{faculty_id}")
def update_faculty(faculty_id: int, faculty: FacultyUpdate, db: Session = Depends(get_db)):
    existing = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Faculty not found")

    for key, value in faculty.dict().items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    db.delete(faculty)
    commit_delete_or_raise(db, "Cannot delete faculty because it is linked to other records.")
    return {"message": "Faculty deleted"}