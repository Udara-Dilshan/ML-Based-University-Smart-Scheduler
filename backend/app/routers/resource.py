from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.resource import Resource
from ..models.academic import Faculty
from ..utils.db_errors import commit_delete_or_raise
from ..utils.dependencies import require_admin_user

router = APIRouter(
    prefix="/resources",
    tags=["resources"],
    dependencies=[Depends(require_admin_user)],
)


TYPE_TO_DB = {
    "LECTURE HALL": "LECTURE_HALL",
    "LECTURE_HALL": "LECTURE_HALL",
    "LAB": "LAB",
    "AUDITORIUM": "AUDITORIUM",
    "SEMINAR ROOM": "AUDITORIUM",
    "SEMINAR_ROOM": "AUDITORIUM",
    "GROUND": "GROUND",
}

DB_TO_DISPLAY = {
    "LECTURE_HALL": "Lecture Hall",
    "LAB": "Lab",
    "AUDITORIUM": "Auditorium",
    "GROUND": "Ground",
}


def _normalize_resource_type(value: str) -> str:
    raw = (value or "").strip()
    normalized_key = raw.upper().replace("-", " ").replace("_", " ")
    normalized_key = " ".join(normalized_key.split())

    if not normalized_key:
        raise HTTPException(status_code=422, detail="Resource type is required")

    db_value = TYPE_TO_DB.get(raw.upper())
    if db_value:
        return db_value

    db_value = TYPE_TO_DB.get(normalized_key)
    if db_value:
        return db_value

    compact_key = normalized_key.replace(" ", "_")
    if compact_key in DB_TO_DISPLAY:
        return compact_key

    raise HTTPException(
        status_code=422,
        detail="Unsupported resource type. Use Lecture Hall, Lab, Auditorium or Ground.",
    )


def _display_resource_type(value: str | None) -> str:
    raw = (value or "").strip().upper()
    return DB_TO_DISPLAY.get(raw, "Unknown")


def _to_resource_response(item: Resource) -> dict:
    return {
        "resource_id": item.resource_id,
        "name": item.name,
        "capacity": item.capacity,
        "type": _display_resource_type(item.type),
        "facilities": item.facilities,
        "location": item.location,
        "faculty_id": item.faculty_id,
        "faculty_name": item.faculty.name if item.faculty else None,
    }


class ResourceBase(BaseModel):
    name: str = Field(min_length=1)
    capacity: int = Field(gt=0)
    type: str = Field(min_length=1)
    faculty_id: int
    facilities: Optional[str] = None
    location: Optional[str] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = Field(default=None, gt=0)
    type: Optional[str] = None
    faculty_id: Optional[int] = None
    facilities: Optional[str] = None
    location: Optional[str] = None


class ResourceOut(ResourceBase):
    resource_id: int
    faculty_name: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(resource: ResourceBase, db: Session = Depends(get_db)):
    duplicate = db.query(Resource).filter(Resource.name == resource.name.strip()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Resource name already exists")

    faculty = db.query(Faculty).filter(Faculty.faculty_id == resource.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    db_resource = Resource(
        name=resource.name.strip(),
        capacity=resource.capacity,
        type=_normalize_resource_type(resource.type),
        faculty_id=resource.faculty_id,
        facilities=(resource.facilities or "").strip() or None,
        location=(resource.location or "").strip() or None,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return _to_resource_response(db_resource)


@router.get("/", response_model=List[ResourceOut])
def get_resources(db: Session = Depends(get_db)):
    resources = db.query(Resource).order_by(Resource.name.asc()).all()
    return [_to_resource_response(resource) for resource in resources]


@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(resource_id: int, resource: ResourceUpdate, db: Session = Depends(get_db)):
    db_resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    data = resource.model_dump(exclude_unset=True)
    if "name" in data:
        new_name = data["name"].strip()
        duplicate = db.query(Resource).filter(
            Resource.name == new_name, Resource.resource_id != resource_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Resource name already exists")
        data["name"] = new_name

    if "type" in data and data["type"] is not None:
        data["type"] = _normalize_resource_type(data["type"])

    if "location" in data:
        data["location"] = (data["location"] or "").strip() or None

    if "facilities" in data:
        data["facilities"] = (data["facilities"] or "").strip() or None

    if "faculty_id" in data and data["faculty_id"] is not None:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == data["faculty_id"]).first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")

    for key, value in data.items():
        setattr(db_resource, key, value)

    db.commit()
    db.refresh(db_resource)
    return _to_resource_response(db_resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    db_res = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(db_res)
    commit_delete_or_raise(db, "Cannot delete resource because it is linked to other records.")
