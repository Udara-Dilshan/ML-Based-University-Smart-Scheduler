from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.resource import Resource
from ..utils.dependencies import require_admin_user

router = APIRouter(
    prefix="/resources",
    tags=["resources"],
    dependencies=[Depends(require_admin_user)],
)


class ResourceBase(BaseModel):
    name: str = Field(min_length=1)
    capacity: int = Field(gt=0)
    type: str = Field(min_length=1)
    location: Optional[str] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = Field(default=None, gt=0)
    type: Optional[str] = None
    location: Optional[str] = None


class ResourceOut(ResourceBase):
    resource_id: int

    class Config:
        from_attributes = True


@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(resource: ResourceBase, db: Session = Depends(get_db)):
    duplicate = db.query(Resource).filter(Resource.name == resource.name.strip()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Resource name already exists")

    db_resource = Resource(
        name=resource.name.strip(),
        capacity=resource.capacity,
        type=resource.type.strip(),
        location=(resource.location or "").strip() or None,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


@router.get("/", response_model=List[ResourceOut])
def get_resources(db: Session = Depends(get_db)):
    return db.query(Resource).order_by(Resource.name.asc()).all()


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
        data["type"] = data["type"].strip()

    if "location" in data:
        data["location"] = (data["location"] or "").strip() or None

    for key, value in data.items():
        setattr(db_resource, key, value)

    db.commit()
    db.refresh(db_resource)
    return db_resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    db_res = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(db_res)
    db.commit()
