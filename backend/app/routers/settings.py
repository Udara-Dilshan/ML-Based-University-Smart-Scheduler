from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.academic import Batch
from ..models.settings import SystemConstraint, SystemSetting
from ..utils.dependencies import require_admin_user


router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(require_admin_user)],
)


class SystemConstraintBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    value: int
    type: str = "HARD"
    batch_id: Optional[int] = None


class SystemConstraintUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    value: Optional[int] = None
    type: Optional[str] = None
    batch_id: Optional[int] = None


class SystemConstraintOut(SystemConstraintBase):
    constraint_id: int

    class Config:
        from_attributes = True


class SystemSettingBase(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=255)


class SystemSettingUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    value: Optional[str] = Field(default=None, min_length=1, max_length=255)


class SystemSettingOut(SystemSettingBase):
    id: int

    class Config:
        from_attributes = True


VALID_CONSTRAINT_TYPES = {"HARD", "SOFT"}


def _normalize_constraint_type(value: str) -> str:
    normalized = (value or "").strip().upper()
    if normalized not in VALID_CONSTRAINT_TYPES:
        raise HTTPException(status_code=422, detail="Constraint type must be HARD or SOFT")
    return normalized


def _validate_batch(batch_id: Optional[int], db: Session) -> None:
    if batch_id is None:
        return
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")


@router.get("/system-constraints", response_model=List[SystemConstraintOut])
def get_system_constraints(
    scope: str = "all",
    batch_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(SystemConstraint)

    normalized_scope = (scope or "all").strip().lower()
    if normalized_scope == "global":
        query = query.filter(SystemConstraint.batch_id.is_(None))
    elif normalized_scope == "batch":
        if batch_id is None:
            return []
        query = query.filter(SystemConstraint.batch_id == batch_id)
    else:
        if batch_id is not None:
            query = query.filter(
                or_(SystemConstraint.batch_id == batch_id, SystemConstraint.batch_id.is_(None))
            )

    return query.order_by(SystemConstraint.name.asc(), SystemConstraint.constraint_id.asc()).all()


@router.post("/system-constraints", response_model=SystemConstraintOut, status_code=status.HTTP_201_CREATED)
def create_system_constraint(payload: SystemConstraintBase, db: Session = Depends(get_db)):
    _validate_batch(payload.batch_id, db)

    constraint_type = _normalize_constraint_type(payload.type)
    name = payload.name.strip()

    duplicate_query = db.query(SystemConstraint).filter(SystemConstraint.name == name)
    if payload.batch_id is None:
        duplicate_query = duplicate_query.filter(SystemConstraint.batch_id.is_(None))
    else:
        duplicate_query = duplicate_query.filter(SystemConstraint.batch_id == payload.batch_id)

    if duplicate_query.first():
        raise HTTPException(status_code=409, detail="Constraint already exists for this scope")

    item = SystemConstraint(
        name=name,
        value=payload.value,
        type=constraint_type,
        batch_id=payload.batch_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/system-constraints/{constraint_id}", response_model=SystemConstraintOut)
def update_system_constraint(constraint_id: int, payload: SystemConstraintUpdate, db: Session = Depends(get_db)):
    item = db.query(SystemConstraint).filter(SystemConstraint.constraint_id == constraint_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Constraint not found")

    data = payload.model_dump(exclude_unset=True)

    if "batch_id" in data:
        _validate_batch(data["batch_id"], db)

    if "type" in data and data["type"] is not None:
        data["type"] = _normalize_constraint_type(data["type"])

    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    target_name = data.get("name", item.name)
    target_batch = data.get("batch_id", item.batch_id)

    duplicate_query = db.query(SystemConstraint).filter(
        SystemConstraint.constraint_id != constraint_id,
        SystemConstraint.name == target_name,
    )
    if target_batch is None:
        duplicate_query = duplicate_query.filter(SystemConstraint.batch_id.is_(None))
    else:
        duplicate_query = duplicate_query.filter(SystemConstraint.batch_id == target_batch)

    if duplicate_query.first():
        raise HTTPException(status_code=409, detail="Constraint already exists for this scope")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/system-constraints/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_constraint(constraint_id: int, db: Session = Depends(get_db)):
    item = db.query(SystemConstraint).filter(SystemConstraint.constraint_id == constraint_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Constraint not found")

    db.delete(item)
    db.commit()


@router.get("/system-settings", response_model=List[SystemSettingOut])
def get_system_settings(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(SystemSetting)
    if category:
        query = query.filter(SystemSetting.category == category.strip().upper())
    return query.order_by(SystemSetting.category.asc(), SystemSetting.value.asc()).all()


@router.post("/system-settings", response_model=SystemSettingOut, status_code=status.HTTP_201_CREATED)
def create_system_setting(payload: SystemSettingBase, db: Session = Depends(get_db)):
    category = payload.category.strip().upper()
    value = payload.value.strip()

    duplicate = db.query(SystemSetting).filter(
        SystemSetting.category == category,
        SystemSetting.value == value,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Setting value already exists in this category")

    item = SystemSetting(category=category, value=value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/system-settings/{setting_id}", response_model=SystemSettingOut)
def update_system_setting(setting_id: int, payload: SystemSettingUpdate, db: Session = Depends(get_db)):
    item = db.query(SystemSetting).filter(SystemSetting.id == setting_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Setting not found")

    data = payload.model_dump(exclude_unset=True)
    if "category" in data and data["category"] is not None:
        data["category"] = data["category"].strip().upper()
    if "value" in data and data["value"] is not None:
        data["value"] = data["value"].strip()

    target_category = data.get("category", item.category)
    target_value = data.get("value", item.value)

    duplicate = db.query(SystemSetting).filter(
        SystemSetting.id != setting_id,
        SystemSetting.category == target_category,
        SystemSetting.value == target_value,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Setting value already exists in this category")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/system-settings/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_setting(setting_id: int, db: Session = Depends(get_db)):
    item = db.query(SystemSetting).filter(SystemSetting.id == setting_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Setting not found")

    db.delete(item)
    db.commit()
