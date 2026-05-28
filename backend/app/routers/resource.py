from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.resource import Resource
from ..models.academic import Faculty, Department
from ..models.event import Vehicle
from ..models.settings import SystemSetting
from ..models.user import UserRole, User
from ..utils.db_errors import commit_delete_or_raise
from ..utils.dependencies import require_roles, require_admin_or_scheduler, get_scheduler_faculty_id

router = APIRouter(
    prefix="/resources",
    tags=["resources"],
    dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.RESOURCE_MANAGER, UserRole.SCHEDULER, UserRole.LECTURER))],
)

admin_or_scheduler = Depends(require_admin_or_scheduler)


LEGACY_TYPE_ALIASES = {
    "LECTURE HALL": "Lecture Hall",
    "LECTURE_HALL": "Lecture Hall",
    "LAB": "Lab",
    "AUDITORIUM": "Auditorium",
    "SEMINAR ROOM": "Auditorium",
    "SEMINAR_ROOM": "Auditorium",
    "GROUND": "Ground",
}


def _normalize_resource_type(value: str, db: Session) -> str:
    raw = (value or "").strip()
    if not raw:
        raise HTTPException(status_code=422, detail="Resource type is required")

    available_types = (
        db.query(SystemSetting)
        .filter(SystemSetting.category == "RESOURCE_TYPES")
        .order_by(SystemSetting.value.asc())
        .all()
    )

    if available_types:
        for item in available_types:
            if raw.lower() == (item.value or "").strip().lower():
                return item.value.strip()

        normalized_key = " ".join(raw.upper().replace("-", " ").replace("_", " ").split())
        legacy_alias = LEGACY_TYPE_ALIASES.get(normalized_key)
        if legacy_alias:
            for item in available_types:
                if legacy_alias.lower() == (item.value or "").strip().lower():
                    return item.value.strip()

        raise HTTPException(
            status_code=422,
            detail="Unsupported resource type. Add it under Settings -> System Dropdowns -> Resource Types first.",
        )

    normalized_key = " ".join(raw.upper().replace("-", " ").replace("_", " ").split())
    if normalized_key in LEGACY_TYPE_ALIASES:
        return LEGACY_TYPE_ALIASES[normalized_key]

    return raw


def _display_resource_type(value: str | None) -> str:
    raw = (value or "").strip().upper()
    return LEGACY_TYPE_ALIASES.get(raw, (value or "").strip())


def _to_resource_response(item: Resource) -> dict:
    department_items = list(item.departments or [])
    if not department_items and item.department:
        department_items = [item.department]

    return {
        "resource_id": item.resource_id,
        "name": item.name,
        "capacity": item.capacity,
        "type": _display_resource_type(item.type),
        "facilities": item.facilities,
        "location": item.location,
        "faculty_id": item.faculty_id,
        "faculty_name": item.faculty.name if item.faculty else None,
        "dept_id": item.dept_id,
        "department_name": item.department.name if item.department else None,
        "dept_ids": [department.dept_id for department in department_items],
        "department_names": [department.name for department in department_items],
    }


def _resolve_departments(
    db: Session,
    faculty_id: int,
    dept_ids: List[int],
) -> List[Department]:
    if not dept_ids:
        raise HTTPException(status_code=422, detail="At least one department is required")

    unique_ids: List[int] = []
    for dept_id in dept_ids:
        if dept_id not in unique_ids:
            unique_ids.append(dept_id)

    departments = db.query(Department).filter(Department.dept_id.in_(unique_ids)).all()
    found_ids = {department.dept_id for department in departments}

    missing = [dept_id for dept_id in unique_ids if dept_id not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"Department not found: {missing[0]}")

    invalid = [department for department in departments if department.faculty_id != faculty_id]
    if invalid:
        raise HTTPException(status_code=422, detail="Department does not belong to selected faculty")

    departments_by_id = {department.dept_id: department for department in departments}
    return [departments_by_id[dept_id] for dept_id in unique_ids]


class ResourceBase(BaseModel):
    name: str = Field(min_length=1)
    capacity: int = Field(gt=0)
    type: str = Field(min_length=1)
    faculty_id: int
    dept_id: Optional[int] = None
    dept_ids: Optional[List[int]] = None
    facilities: Optional[str] = None
    location: Optional[str] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = Field(default=None, gt=0)
    type: Optional[str] = None
    faculty_id: Optional[int] = None
    dept_id: Optional[int] = None
    dept_ids: Optional[List[int]] = None
    facilities: Optional[str] = None
    location: Optional[str] = None


class ResourceOut(ResourceBase):
    resource_id: int
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    dept_ids: List[int] = Field(default_factory=list)
    department_names: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class VehicleBase(BaseModel):
    reg_number: str = Field(min_length=1, max_length=20)
    type: Optional[str] = Field(default=None, max_length=50)
    capacity: int = Field(gt=0)
    driver_name: Optional[str] = Field(default=None, max_length=100)
    is_available: bool = True


class VehicleUpdate(BaseModel):
    reg_number: Optional[str] = Field(default=None, min_length=1, max_length=20)
    type: Optional[str] = Field(default=None, max_length=50)
    capacity: Optional[int] = Field(default=None, gt=0)
    driver_name: Optional[str] = Field(default=None, max_length=100)
    is_available: Optional[bool] = None


class VehicleOut(VehicleBase):
    vehicle_id: int

    class Config:
        from_attributes = True


class FacultyListOut(BaseModel):
    faculty_id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentListOut(BaseModel):
    dept_id: int
    name: str
    code: Optional[str] = None
    faculty_id: int

    class Config:
        from_attributes = True


class SystemSettingListOut(BaseModel):
    id: int
    category: str
    value: str

    class Config:
        from_attributes = True


@router.get("/faculties", response_model=List[FacultyListOut])
def get_resource_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).order_by(Faculty.name.asc()).all()


@router.get("/departments", response_model=List[DepartmentListOut])
def get_resource_departments(faculty_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Department)
    if faculty_id is not None:
        query = query.filter(Department.faculty_id == faculty_id)
    return query.order_by(Department.name.asc()).all()


@router.get("/system-settings", response_model=List[SystemSettingListOut])
def get_resource_system_settings(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(SystemSetting)
    if category:
        query = query.filter(SystemSetting.category == category.strip().upper())
    return query.order_by(SystemSetting.category.asc(), SystemSetting.value.asc()).all()


@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(resource: ResourceBase, db: Session = Depends(get_db), current_user: User = admin_or_scheduler):
    # Scheduler: restrict to their own faculty
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None and resource.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Scheduler can only create resources within their faculty")
    duplicate = db.query(Resource).filter(Resource.name == resource.name.strip()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Resource name already exists")

    faculty = db.query(Faculty).filter(Faculty.faculty_id == resource.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    requested_dept_ids = list(resource.dept_ids or [])
    if resource.dept_id is not None and resource.dept_id not in requested_dept_ids:
        requested_dept_ids.insert(0, resource.dept_id)

    departments = _resolve_departments(db, resource.faculty_id, requested_dept_ids)

    db_resource = Resource(
        name=resource.name.strip(),
        capacity=resource.capacity,
        type=_normalize_resource_type(resource.type, db),
        faculty_id=resource.faculty_id,
        dept_id=departments[0].dept_id,
        facilities=(resource.facilities or "").strip() or None,
        location=(resource.location or "").strip() or None,
    )
    db_resource.departments = departments
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return _to_resource_response(db_resource)


@router.get("/", response_model=List[ResourceOut])
def get_resources(db: Session = Depends(get_db)):
    resources = db.query(Resource).order_by(Resource.name.asc()).all()
    return [_to_resource_response(resource) for resource in resources]


@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(resource_id: int, resource: ResourceUpdate, db: Session = Depends(get_db), current_user: User = admin_or_scheduler):
    db_resource = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    # Scheduler: restrict to their own faculty
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None and db_resource.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Access denied: resource is outside your faculty")

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
        data["type"] = _normalize_resource_type(data["type"], db)

    if "location" in data:
        data["location"] = (data["location"] or "").strip() or None

    if "facilities" in data:
        data["facilities"] = (data["facilities"] or "").strip() or None

    if "faculty_id" in data and data["faculty_id"] is not None:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == data["faculty_id"]).first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")

    target_faculty_id = data.get("faculty_id", db_resource.faculty_id)
    requested_dept_ids = data.pop("dept_ids", None)

    if requested_dept_ids is None and "dept_id" in data and data["dept_id"] is not None:
        requested_dept_ids = [data["dept_id"]]

    if requested_dept_ids is None:
        existing_ids = [department.dept_id for department in db_resource.departments]
        if not existing_ids and db_resource.dept_id is not None:
            existing_ids = [db_resource.dept_id]
        requested_dept_ids = existing_ids

    departments = _resolve_departments(db, target_faculty_id, requested_dept_ids)
    data["dept_id"] = departments[0].dept_id

    for key, value in data.items():
        setattr(db_resource, key, value)

    db_resource.departments = departments

    db.commit()
    db.refresh(db_resource)
    return _to_resource_response(db_resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, db: Session = Depends(get_db), current_user: User = admin_or_scheduler):
    db_res = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Resource not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None and db_res.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Access denied: resource is outside your faculty")
    db.delete(db_res)
    commit_delete_or_raise(db, "Cannot delete resource because it is linked to other records.")


@router.get("/vehicles", response_model=List[VehicleOut])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.reg_number.asc()).all()


@router.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleBase, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.RESOURCE_MANAGER))):
    reg_number = payload.reg_number.strip().upper()
    duplicate = db.query(Vehicle).filter(Vehicle.reg_number == reg_number).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Registration number already exists")

    vehicle = Vehicle(
        reg_number=reg_number,
        type=(payload.type or "").strip() or None,
        capacity=payload.capacity,
        driver_name=(payload.driver_name or "").strip() or None,
        is_available=payload.is_available,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.RESOURCE_MANAGER))):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data = payload.model_dump(exclude_unset=True)

    if "reg_number" in data:
        reg_number = data["reg_number"].strip().upper()
        duplicate = db.query(Vehicle).filter(
            Vehicle.reg_number == reg_number,
            Vehicle.vehicle_id != vehicle_id,
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="Registration number already exists")
        data["reg_number"] = reg_number

    if "type" in data:
        data["type"] = (data["type"] or "").strip() or None

    if "driver_name" in data:
        data["driver_name"] = (data["driver_name"] or "").strip() or None

    for key, value in data.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.RESOURCE_MANAGER))):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(vehicle)
    commit_delete_or_raise(db, "Cannot delete vehicle because it is linked to other records.")
