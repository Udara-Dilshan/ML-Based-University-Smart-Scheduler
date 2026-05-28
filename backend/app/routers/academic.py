import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from ..database.connection import get_db
from ..models.academic import Batch, BatchActiveTerm, Degree, DegreeSemesterModule, Department, Faculty, LecturerModuleAssignment, Module
from ..models.user import User, UserRole
from ..utils.db_errors import commit_delete_or_raise
from ..utils.dependencies import (
    require_admin_user,
    require_admin_or_scheduler,
    get_scheduler_faculty_id,
    _normalize_role,
)

router = APIRouter(
    prefix="/academic",
    tags=["academic"],
)


class FacultyBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    dean_name: Optional[str] = None


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    dean_name: Optional[str] = None


class FacultyOut(BaseModel):
    faculty_id: int
    name: str
    code: Optional[str] = None
    dean_name: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    faculty_id: int


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    faculty_id: Optional[int] = None


class DepartmentOut(DepartmentBase):
    dept_id: int
    faculty: FacultyOut

    class Config:
        from_attributes = True


class ModuleBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    dept_id: int
    degree_id: int
    credits: int = Field(gt=0)
    lecture_hours_per_week: int = Field(gt=0)
    required_resource_type: Optional[str] = None


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    dept_id: Optional[int] = None
    degree_id: Optional[int] = None
    credits: Optional[int] = Field(default=None, gt=0)
    lecture_hours_per_week: Optional[int] = Field(default=None, gt=0)
    required_resource_type: Optional[str] = None


class ModuleOut(ModuleBase):
    module_id: int
    department: DepartmentOut

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_code: str = Field(min_length=1)
    degree_id: int
    student_count: int = Field(ge=0)
    current_semester: int = Field(gt=0)


class BatchUpdate(BaseModel):
    batch_code: Optional[str] = None
    degree_id: Optional[int] = None
    student_count: Optional[int] = Field(default=None, ge=0)
    current_semester: Optional[int] = Field(default=None, gt=0)


class DegreeBase(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    dept_id: int
    duration_years: int = Field(gt=0)


class DegreeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    dept_id: Optional[int] = None
    duration_years: Optional[int] = Field(default=None, gt=0)


class DegreeOut(BaseModel):
    degree_id: int
    code: str
    dept_id: int
    name: str
    duration_years: int

    class Config:
        from_attributes = True


class DegreeSemesterModuleOptionOut(BaseModel):
    module_id: int
    code: str
    name: str
    credits: int
    lecture_hours_per_week: int
    assigned: bool


class DegreeSemesterModuleSelectionOut(BaseModel):
    degree_id: int
    degree_name: str
    degree_code: str
    semester_number: int
    semester_label: str
    modules: List[DegreeSemesterModuleOptionOut]


class DegreeSemesterModuleSave(BaseModel):
    degree_id: int
    semester_number: int = Field(ge=1, le=10)
    module_ids: List[int] = Field(default_factory=list)


class DegreeSemesterModuleSaveOut(BaseModel):
    degree_id: int
    semester_number: int
    saved_count: int


class DegreeSemesterModuleRowOut(BaseModel):
    id: int
    degree_id: int
    degree_name: str
    degree_code: str
    semester_number: int
    semester_label: str
    module_id: int
    module_code: str
    module_name: str
    credits: int
    lecture_hours_per_week: int


def _semester_label(semester_number: int) -> str:
    year = ((semester_number - 1) // 2) + 1
    semester = 1 if semester_number % 2 == 1 else 2
    return f"Year {year} Semester {semester}"


SEMESTER_NAME_TO_NUMBER = {
    _semester_label(number): number
    for number in range(1, 11)
}

RETRYABLE_MYSQL_ERROR_CODES = {1205, 1213}


def _is_retryable_mysql_error(exc: OperationalError) -> bool:
    original = getattr(exc, "orig", None)
    if original is None or not getattr(original, "args", None):
        return False

    code = original.args[0]
    return isinstance(code, int) and code in RETRYABLE_MYSQL_ERROR_CODES


def _validate_degree_semester(degree: Degree, semester_number: int) -> None:
    max_semester = max(1, degree.duration_years) * 2
    if semester_number > max_semester:
        raise HTTPException(
            status_code=422,
            detail=f"Selected semester is out of range for this degree. Maximum allowed is Year {degree.duration_years} Semester 2.",
        )


def _validate_batch_active_term(batch: Batch, semester_name: str) -> int:
    normalized_semester_name = semester_name.strip()
    if normalized_semester_name not in SEMESTER_NAME_TO_NUMBER:
        raise HTTPException(
            status_code=422,
            detail="Invalid semester_name. Use values like 'Year 1 Semester 1'.",
        )

    semester_number = SEMESTER_NAME_TO_NUMBER[normalized_semester_name]
    degree_duration_years = batch.degree.duration_years if batch.degree else 5
    max_semester = max(1, degree_duration_years) * 2
    if semester_number > max_semester:
        raise HTTPException(
            status_code=422,
            detail=f"Selected semester is out of range for this batch's degree. Maximum allowed is Year {degree_duration_years} Semester 2.",
        )

    return semester_number


class BatchActiveTermSave(BaseModel):
    semester_name: str = Field(min_length=1)


class BatchActiveTermOut(BaseModel):
    id: int
    batch_id: int
    semester_name: str
    is_active: bool

    class Config:
        from_attributes = True


class LecturerOptionOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    dept_id: Optional[int] = None


class LecturerAllocationModuleOut(BaseModel):
    module_id: int
    code: str
    name: str
    credits: int
    lecture_hours_per_week: int
    assigned_lecturer_user_id: Optional[int] = None
    assigned_lecturer_name: Optional[str] = None


class LecturerAllocationBatchModulesOut(BaseModel):
    batch_id: int
    batch_code: str
    degree_id: int
    degree_name: str
    semester_name: str
    semester_number: int
    modules: List[LecturerAllocationModuleOut]


class LecturerModuleAssignmentSave(BaseModel):
    batch_id: int
    module_id: int
    lecturer_user_id: int


class LecturerModuleAssignmentOut(BaseModel):
    id: int
    batch_id: int
    module_id: int
    lecturer_user_id: int
    lecturer_name: str
    is_active: bool


def _resolve_batch_semester(batch: Batch, db: Session) -> tuple[int, str]:
    active_term = (
        db.query(BatchActiveTerm)
        .filter(
            BatchActiveTerm.batch_id == batch.batch_id,
            BatchActiveTerm.is_active.is_(True),
        )
        .order_by(BatchActiveTerm.id.desc())
        .first()
    )

    if active_term and active_term.semester_name in SEMESTER_NAME_TO_NUMBER:
        semester_number = SEMESTER_NAME_TO_NUMBER[active_term.semester_name]
        semester_name = active_term.semester_name
    else:
        semester_number = batch.current_semester
        semester_name = _semester_label(semester_number)

    if batch.degree:
        _validate_degree_semester(batch.degree, semester_number)

    return semester_number, semester_name


class BatchOut(BatchBase):
    batch_id: int
    degree_id: int
    student_count: int
    current_semester: int
    name: str
    degree: Optional[DegreeOut] = None
    active_term: Optional[BatchActiveTermOut] = None

    class Config:
        from_attributes = True


@router.post("/faculties", response_model=FacultyOut, status_code=status.HTTP_201_CREATED)
def create_faculty(payload: FacultyBase, db: Session = Depends(get_db), _: User = Depends(require_admin_user)):
    duplicate = (
        db.query(Faculty)
        .filter((Faculty.code == payload.code) | (Faculty.name == payload.name))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Faculty name or code already exists")

    item = Faculty(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        dean_name=payload.dean_name.strip() if payload.dean_name else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/faculties", response_model=List[FacultyOut])
def get_faculties(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(Faculty)
    if faculty_id is not None:
        query = query.filter(Faculty.faculty_id == faculty_id)
    return query.order_by(Faculty.name.asc()).all()


@router.put("/faculties/{faculty_id}", response_model=FacultyOut)
def update_faculty(faculty_id: int, payload: FacultyUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin_user)):
    item = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()
    if "dean_name" in data and data["dean_name"]:
        data["dean_name"] = data["dean_name"].strip()

    if "name" in data or "code" in data:
        duplicate_query = db.query(Faculty).filter(Faculty.faculty_id != faculty_id)
        if "name" in data:
            duplicate_query = duplicate_query.filter(Faculty.name == data["name"])
            if duplicate_query.first():
                raise HTTPException(status_code=409, detail="Faculty name already exists")
        if "code" in data:
            duplicate_query = db.query(Faculty).filter(
                Faculty.code == data["code"], Faculty.faculty_id != faculty_id
            )
            if duplicate_query.first():
                raise HTTPException(status_code=409, detail="Faculty code already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/faculties/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty(faculty_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin_user)):
    item = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Faculty not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete faculty because it is linked to other records. Delete dependent departments first.")


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentBase, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    # Scheduler can only add departments to their own faculty
    if faculty_id is not None and payload.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Scheduler can only create departments within their faculty")
    faculty = db.query(Faculty).filter(Faculty.faculty_id == payload.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    duplicate = (
        db.query(Department)
        .filter((Department.code == payload.code) | (Department.name == payload.name))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Department name or code already exists")

    item = Department(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        faculty_id=payload.faculty_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/degrees", response_model=List[DegreeOut])
def get_degrees(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(Degree).order_by(Degree.name.asc())
    if faculty_id is not None:
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        query = query.filter(Degree.dept_id.in_(dept_ids)) if dept_ids else query.filter(False)
    return query.all()


@router.post("/degrees", response_model=DegreeOut, status_code=status.HTTP_201_CREATED)
def create_degree(payload: DegreeBase, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    # Scheduler: verify the dept belongs to their faculty
    if faculty_id is not None:
        department = db.query(Department).filter(Department.dept_id == payload.dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        if department.faculty_id != faculty_id:
            raise HTTPException(status_code=403, detail="Access denied: department is outside your faculty")
    department = db.query(Department).filter(Department.dept_id == payload.dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    code = payload.code.strip().upper()
    duplicate_code = db.query(Degree).filter(Degree.code == code).first()
    if duplicate_code:
        raise HTTPException(status_code=409, detail="Degree code already exists")

    duplicate = db.query(Degree).filter(
        Degree.name == payload.name.strip(),
        Degree.dept_id == payload.dept_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Degree already exists in this department")

    item = Degree(
        code=code,
        name=payload.name.strip(),
        dept_id=payload.dept_id,
        duration_years=payload.duration_years,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/degrees/{degree_id}", response_model=DegreeOut)
def update_degree(degree_id: int, payload: DegreeUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Degree).filter(Degree.degree_id == degree_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Degree not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None:
        dept = db.query(Department).filter(Department.dept_id == item.dept_id).first()
        if not dept or dept.faculty_id != faculty_id:
            raise HTTPException(status_code=403, detail="Access denied: degree is outside your faculty")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()
    if "dept_id" in data:
        department = db.query(Department).filter(Department.dept_id == data["dept_id"]).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    if "code" in data:
        duplicate_code = db.query(Degree).filter(
            Degree.degree_id != degree_id,
            Degree.code == data["code"],
        ).first()
        if duplicate_code:
            raise HTTPException(status_code=409, detail="Degree code already exists")

    target_name = data.get("name", item.name)
    target_dept = data.get("dept_id", item.dept_id)
    duplicate = db.query(Degree).filter(
        Degree.degree_id != degree_id,
        Degree.name == target_name,
        Degree.dept_id == target_dept,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Degree already exists in this department")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/degrees/{degree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_degree(degree_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Degree).filter(Degree.degree_id == degree_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Degree not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None:
        dept = db.query(Department).filter(Department.dept_id == item.dept_id).first()
        if not dept or dept.faculty_id != faculty_id:
            raise HTTPException(status_code=403, detail="Access denied: degree is outside your faculty")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete degree because it is linked to batches or other records.")


@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(Department).order_by(Department.name.asc())
    if faculty_id is not None:
        query = query.filter(Department.faculty_id == faculty_id)
    return query.all()


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Department not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None and item.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Access denied: department is outside your faculty")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()

    if "faculty_id" in data:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == data["faculty_id"]).first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")

    if "code" in data:
        duplicate = db.query(Department).filter(
            Department.code == data["code"], Department.dept_id != dept_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Department code already exists")

    if "name" in data:
        duplicate = db.query(Department).filter(
            Department.name == data["name"], Department.dept_id != dept_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Department name already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Department not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None and item.faculty_id != faculty_id:
        raise HTTPException(status_code=403, detail="Access denied: department is outside your faculty")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete department because it is linked to other records. Delete dependent courses or batches first.")


@router.post("/modules", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
def create_module(payload: ModuleBase, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            normalized_code = payload.code.strip().upper()
            normalized_name = payload.name.strip()

            department = db.query(Department).filter(Department.dept_id == payload.dept_id).first()
            if not department:
                raise HTTPException(status_code=404, detail="Department not found")

            degree = db.query(Degree).filter(Degree.degree_id == payload.degree_id).first()
            if not degree:
                raise HTTPException(status_code=404, detail="Degree not found")
            if degree.dept_id != payload.dept_id:
                raise HTTPException(status_code=422, detail="Selected degree does not belong to selected department")

            if not payload.required_resource_type or not payload.required_resource_type.strip():
                raise HTTPException(status_code=422, detail="Required resource type is required")

            duplicate = db.query(Module).filter(
                Module.degree_id == payload.degree_id,
                (Module.code == normalized_code) | (Module.name == normalized_name),
            )
            if duplicate.first():
                raise HTTPException(
                    status_code=409,
                    detail="Course name or code already exists for the selected degree",
                )

            item = Module(
                name=normalized_name,
                code=normalized_code,
                dept_id=payload.dept_id,
                degree_id=payload.degree_id,
                credits=payload.credits,
                lecture_hours_per_week=payload.lecture_hours_per_week,
                required_resource_type=payload.required_resource_type.strip(),
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            return item
        except HTTPException:
            db.rollback()
            raise
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Course name or code already exists for the selected degree",
            )
        except OperationalError as exc:
            db.rollback()
            if _is_retryable_mysql_error(exc) and attempt < max_retries - 1:
                time.sleep(0.05 * (attempt + 1))
                continue
            raise HTTPException(
                status_code=503,
                detail="Temporary database contention while creating course. Please retry.",
            )


@router.get("/modules", response_model=List[ModuleOut])
def get_modules(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(Module).order_by(Module.name.asc())
    if faculty_id is not None:
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        query = query.filter(Module.dept_id.in_(dept_ids)) if dept_ids else query.filter(False)
    return query.all()


@router.get("/degree-semester-modules/selection", response_model=DegreeSemesterModuleSelectionOut)
def get_degree_semester_module_selection(
    degree_id: int,
    semester_number: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    degree = db.query(Degree).filter(Degree.degree_id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    _validate_degree_semester(degree, semester_number)

    modules = (
        db.query(Module)
        .filter(Module.degree_id == degree_id)
        .order_by(Module.name.asc())
        .all()
    )

    assigned_module_ids = {
        item.module_id
        for item in db.query(DegreeSemesterModule)
        .filter(
            DegreeSemesterModule.degree_id == degree_id,
            DegreeSemesterModule.semester_number == semester_number,
        )
        .all()
    }

    return {
        "degree_id": degree.degree_id,
        "degree_name": degree.name,
        "degree_code": degree.code,
        "semester_number": semester_number,
        "semester_label": _semester_label(semester_number),
        "modules": [
            {
                "module_id": module.module_id,
                "code": module.code,
                "name": module.name,
                "credits": module.credits,
                "lecture_hours_per_week": module.lecture_hours_per_week,
                "assigned": module.module_id in assigned_module_ids,
            }
            for module in modules
        ],
    }


@router.put("/degree-semester-modules", response_model=DegreeSemesterModuleSaveOut)
def save_degree_semester_modules(payload: DegreeSemesterModuleSave, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    degree = db.query(Degree).filter(Degree.degree_id == payload.degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    _validate_degree_semester(degree, payload.semester_number)

    unique_module_ids = sorted(set(payload.module_ids))

    if unique_module_ids:
        modules = (
            db.query(Module)
            .filter(Module.module_id.in_(unique_module_ids))
            .all()
        )
        if len(modules) != len(unique_module_ids):
            raise HTTPException(status_code=404, detail="One or more selected modules were not found")

        for module in modules:
            if module.degree_id != payload.degree_id:
                raise HTTPException(
                    status_code=422,
                    detail=f"Module '{module.code}' does not belong to the selected degree",
                )

    db.query(DegreeSemesterModule).filter(
        DegreeSemesterModule.degree_id == payload.degree_id,
        DegreeSemesterModule.semester_number == payload.semester_number,
    ).delete(synchronize_session=False)

    for module_id in unique_module_ids:
        db.add(
            DegreeSemesterModule(
                degree_id=payload.degree_id,
                semester_number=payload.semester_number,
                module_id=module_id,
            )
        )

    db.commit()

    return {
        "degree_id": payload.degree_id,
        "semester_number": payload.semester_number,
        "saved_count": len(unique_module_ids),
    }


@router.get("/degree-semester-modules", response_model=List[DegreeSemesterModuleRowOut])
def get_degree_semester_modules(
    degree_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = (
        db.query(DegreeSemesterModule, Module, Degree)
        .join(Module, Module.module_id == DegreeSemesterModule.module_id)
        .join(Degree, Degree.degree_id == DegreeSemesterModule.degree_id)
    )

    if degree_id is not None:
        query = query.filter(DegreeSemesterModule.degree_id == degree_id)
    elif faculty_id is not None:
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        if dept_ids:
            query = query.join(Department, Degree.dept_id == Department.dept_id).filter(Department.faculty_id == faculty_id)
        else:
            return []

    rows = (
        query.order_by(
            Degree.name.asc(),
            DegreeSemesterModule.semester_number.asc(),
            Module.code.asc(),
        )
        .all()
    )

    return [
        {
            "id": mapping.id,
            "degree_id": degree.degree_id,
            "degree_name": degree.name,
            "degree_code": degree.code,
            "semester_number": mapping.semester_number,
            "semester_label": _semester_label(mapping.semester_number),
            "module_id": module.module_id,
            "module_code": module.code,
            "module_name": module.name,
            "credits": module.credits,
            "lecture_hours_per_week": module.lecture_hours_per_week,
        }
        for mapping, module, degree in rows
    ]


@router.put("/modules/{module_id}", response_model=ModuleOut)
def update_module(module_id: int, payload: ModuleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Module).filter(Module.module_id == module_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")

    data = payload.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = data["code"].strip().upper()
    if "name" in data:
        data["name"] = data["name"].strip()
    if "required_resource_type" in data and data["required_resource_type"] is not None:
        data["required_resource_type"] = data["required_resource_type"].strip()
        if not data["required_resource_type"]:
            raise HTTPException(status_code=422, detail="Required resource type is required")

    if "dept_id" in data:
        department = db.query(Department).filter(Department.dept_id == data["dept_id"]).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    if "degree_id" in data:
        degree = db.query(Degree).filter(Degree.degree_id == data["degree_id"]).first()
        if not degree:
            raise HTTPException(status_code=404, detail="Degree not found")

    effective_dept = data.get("dept_id", item.dept_id)
    effective_degree = data.get("degree_id", item.degree_id)
    effective_code = data.get("code", item.code)
    effective_name = data.get("name", item.name)
    degree = db.query(Degree).filter(Degree.degree_id == effective_degree).first()
    if degree and degree.dept_id != effective_dept:
        raise HTTPException(status_code=422, detail="Selected degree does not belong to selected department")

    duplicate_code = db.query(Module).filter(
        Module.degree_id == effective_degree,
        Module.code == effective_code,
        Module.module_id != module_id,
    )
    if duplicate_code.first():
        raise HTTPException(status_code=409, detail="Course code already exists for the selected degree")

    duplicate_name = db.query(Module).filter(
        Module.degree_id == effective_degree,
        Module.name == effective_name,
        Module.module_id != module_id,
    )
    if duplicate_name.first():
        raise HTTPException(status_code=409, detail="Course name already exists for the selected degree")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Module).filter(Module.module_id == module_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete course because it is linked to other records.")


@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchBase, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None:
        degree = db.query(Degree).filter(Degree.degree_id == payload.degree_id).first()
        if not degree:
            raise HTTPException(status_code=404, detail="Degree not found")
        dept = db.query(Department).filter(Department.dept_id == degree.dept_id).first()
        if not dept or dept.faculty_id != faculty_id:
            raise HTTPException(status_code=403, detail="Access denied: degree is outside your faculty")
    degree = db.query(Degree).filter(Degree.degree_id == payload.degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    duplicate = db.query(Batch).filter(Batch.batch_code == payload.batch_code.strip()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Batch code already exists")

    item = Batch(
        batch_code=payload.batch_code.strip(),
        degree_id=payload.degree_id,
        student_count=payload.student_count,
        current_semester=payload.current_semester,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/batches", response_model=List[BatchOut])
def get_batches(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(Batch).order_by(Batch.batch_id.desc())
    if faculty_id is not None:
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        degree_ids = [deg.degree_id for deg in db.query(Degree).filter(Degree.dept_id.in_(dept_ids)).all()] if dept_ids else []
        query = query.filter(Batch.degree_id.in_(degree_ids)) if degree_ids else query.filter(False)
    batches = query.all()
    active_terms = db.query(BatchActiveTerm).filter(BatchActiveTerm.is_active.is_(True)).all()
    active_term_by_batch_id = {term.batch_id: term for term in active_terms}

    for batch in batches:
        setattr(batch, "active_term", active_term_by_batch_id.get(batch.batch_id))

    return batches


@router.put("/batches/{batch_id}/active-term", response_model=BatchActiveTermOut)
def assign_or_update_batch_active_term(
    batch_id: int,
    payload: BatchActiveTermSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    semester_name = payload.semester_name.strip()

    max_retries = 3

    for attempt in range(max_retries):
        try:
            batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
            if not batch:
                raise HTTPException(status_code=404, detail="Batch not found")

            semester_number = _validate_batch_active_term(batch, semester_name)

            current_active_term = (
                db.query(BatchActiveTerm)
                .filter(
                    BatchActiveTerm.batch_id == batch_id,
                    BatchActiveTerm.is_active.is_(True),
                )
                .order_by(BatchActiveTerm.id.desc())
                .first()
            )

            term = db.query(BatchActiveTerm).filter(
                BatchActiveTerm.batch_id == batch_id,
                BatchActiveTerm.semester_name == semester_name,
            ).first()

            if current_active_term and (not term or current_active_term.id != term.id):
                current_active_term.is_active = False

            if term:
                term.is_active = True
            else:
                term = BatchActiveTerm(
                    batch_id=batch_id,
                    semester_name=semester_name,
                    is_active=True,
                )
                db.add(term)

            # Keep legacy integer semester in sync for existing scheduler logic.
            batch.current_semester = semester_number

            db.commit()
            db.refresh(term)
            return term
        except HTTPException:
            db.rollback()
            raise
        except IntegrityError:
            db.rollback()
            if attempt < max_retries - 1:
                time.sleep(0.05 * (attempt + 1))
                continue
            raise HTTPException(
                status_code=409,
                detail="Failed to save active term due to a concurrent update. Please retry.",
            )
        except OperationalError as exc:
            db.rollback()
            if _is_retryable_mysql_error(exc) and attempt < max_retries - 1:
                time.sleep(0.05 * (attempt + 1))
                continue
            raise HTTPException(
                status_code=503,
                detail="Temporary database contention while saving active term. Please retry.",
            )


@router.get("/lecturer-allocations/lecturers", response_model=List[LecturerOptionOut])
def get_lecturer_options(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(User).filter(User.role.in_(["LECTURER", "Lecturer"]))
    if faculty_id is not None:
        from ..models.profiles import Lecturer as LecturerProfile
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        lecturer_user_ids = [
            lp.user_id for lp in db.query(LecturerProfile).filter(
                LecturerProfile.department.in_([str(d) for d in dept_ids])
            ).all()
        ] if dept_ids else []
        query = query.filter(User.user_id.in_(lecturer_user_ids))
    lecturers = query.order_by(User.first_name.asc(), User.last_name.asc()).all()

    return [
        {
            "user_id": lecturer.user_id,
            "full_name": f"{lecturer.first_name} {lecturer.last_name}".strip(),
            "email": lecturer.email,
            "dept_id": int(lecturer.lecturer_profile.department)
            if lecturer.lecturer_profile and lecturer.lecturer_profile.department is not None
            and str(lecturer.lecturer_profile.department).strip().isdigit()
            else None,
        }
        for lecturer in lecturers
    ]


@router.get("/lecturer-allocations/active-modules", response_model=LecturerAllocationBatchModulesOut)
def get_active_modules_for_batch(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if not batch.degree:
        raise HTTPException(status_code=404, detail="Degree not found for selected batch")

    semester_number, semester_name = _resolve_batch_semester(batch, db)

    modules = (
        db.query(Module)
        .join(DegreeSemesterModule, DegreeSemesterModule.module_id == Module.module_id)
        .filter(
            DegreeSemesterModule.degree_id == batch.degree_id,
            DegreeSemesterModule.semester_number == semester_number,
        )
        .order_by(Module.name.asc())
        .all()
    )

    module_ids = [module.module_id for module in modules]
    assignments = []
    if module_ids:
        assignments = (
            db.query(LecturerModuleAssignment)
            .filter(
                LecturerModuleAssignment.batch_id == batch.batch_id,
                LecturerModuleAssignment.module_id.in_(module_ids),
                LecturerModuleAssignment.is_active.is_(True),
            )
            .all()
        )

    assignment_by_module_id = {item.module_id: item for item in assignments}
    lecturer_ids = [item.lecturer_user_id for item in assignments]
    lecturer_by_id = {}
    if lecturer_ids:
        lecturer_rows = db.query(User).filter(User.user_id.in_(lecturer_ids)).all()
        lecturer_by_id = {item.user_id: item for item in lecturer_rows}

    return {
        "batch_id": batch.batch_id,
        "batch_code": batch.batch_code,
        "degree_id": batch.degree_id,
        "degree_name": batch.degree.name,
        "semester_name": semester_name,
        "semester_number": semester_number,
        "modules": [
            {
                "module_id": module.module_id,
                "code": module.code,
                "name": module.name,
                "credits": module.credits,
                "lecture_hours_per_week": module.lecture_hours_per_week,
                "assigned_lecturer_user_id": assignment_by_module_id[module.module_id].lecturer_user_id
                if module.module_id in assignment_by_module_id
                else None,
                "assigned_lecturer_name": (
                    f"{lecturer_by_id[assignment_by_module_id[module.module_id].lecturer_user_id].first_name} "
                    f"{lecturer_by_id[assignment_by_module_id[module.module_id].lecturer_user_id].last_name}"
                ).strip()
                if module.module_id in assignment_by_module_id
                and assignment_by_module_id[module.module_id].lecturer_user_id in lecturer_by_id
                else None,
            }
            for module in modules
        ],
    }


@router.put("/lecturer-allocations/assign", response_model=LecturerModuleAssignmentOut)
def assign_lecturer_to_module(payload: LecturerModuleAssignmentSave, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    batch = db.query(Batch).filter(Batch.batch_id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    module = db.query(Module).filter(Module.module_id == payload.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    if module.degree_id != batch.degree_id:
        raise HTTPException(status_code=422, detail="Selected module does not belong to selected batch")

    lecturer = db.query(User).filter(User.user_id == payload.lecturer_user_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")
    if lecturer.role not in {"LECTURER", "Lecturer"}:
        raise HTTPException(status_code=422, detail="Selected user is not a lecturer")

    lecturer_dept_id = None
    if lecturer.lecturer_profile and lecturer.lecturer_profile.department is not None:
        raw_dept = str(lecturer.lecturer_profile.department).strip()
        if raw_dept.isdigit():
            lecturer_dept_id = int(raw_dept)

    if lecturer_dept_id is None:
        raise HTTPException(status_code=422, detail="Selected lecturer has no department configured")
    if batch.degree and lecturer_dept_id != batch.degree.dept_id:
        raise HTTPException(status_code=422, detail="Selected lecturer does not belong to this batch's department")

    semester_number, _ = _resolve_batch_semester(batch, db)
    is_active_module = (
        db.query(DegreeSemesterModule)
        .filter(
            DegreeSemesterModule.degree_id == batch.degree_id,
            DegreeSemesterModule.semester_number == semester_number,
            DegreeSemesterModule.module_id == payload.module_id,
        )
        .first()
    )
    if not is_active_module:
        raise HTTPException(status_code=422, detail="Selected module is not active for current semester")

    item = (
        db.query(LecturerModuleAssignment)
        .filter(
            LecturerModuleAssignment.batch_id == payload.batch_id,
            LecturerModuleAssignment.module_id == payload.module_id,
        )
        .first()
    )

    if not item:
        item = LecturerModuleAssignment(
            batch_id=payload.batch_id,
            module_id=payload.module_id,
            lecturer_user_id=payload.lecturer_user_id,
            is_active=True,
        )
        db.add(item)
    else:
        item.lecturer_user_id = payload.lecturer_user_id
        item.is_active = True

    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "batch_id": item.batch_id,
        "module_id": item.module_id,
        "lecturer_user_id": item.lecturer_user_id,
        "lecturer_name": f"{lecturer.first_name} {lecturer.last_name}".strip(),
        "is_active": item.is_active,
    }


@router.put("/batches/{batch_id}", response_model=BatchOut)
def update_batch(batch_id: int, payload: BatchUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Batch not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None:
        degree = db.query(Degree).filter(Degree.degree_id == item.degree_id).first()
        if degree:
            dept = db.query(Department).filter(Department.dept_id == degree.dept_id).first()
            if not dept or dept.faculty_id != faculty_id:
                raise HTTPException(status_code=403, detail="Access denied: batch is outside your faculty")

    data = payload.model_dump(exclude_unset=True)
    if "batch_code" in data:
        data["batch_code"] = data["batch_code"].strip()
    if "degree_id" in data:
        degree = db.query(Degree).filter(Degree.degree_id == data["degree_id"]).first()
        if not degree:
            raise HTTPException(status_code=404, detail="Degree not found")

    if "batch_code" in data:
        duplicate = db.query(Batch).filter(
            Batch.batch_code == data["batch_code"], Batch.batch_id != batch_id
        )
        if duplicate.first():
            raise HTTPException(status_code=409, detail="Batch code already exists")

    for key, value in data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_scheduler)):
    item = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Batch not found")
    faculty_id = get_scheduler_faculty_id(current_user)
    if faculty_id is not None:
        degree = db.query(Degree).filter(Degree.degree_id == item.degree_id).first()
        if degree:
            dept = db.query(Department).filter(Department.dept_id == degree.dept_id).first()
            if not dept or dept.faculty_id != faculty_id:
                raise HTTPException(status_code=403, detail="Access denied: batch is outside your faculty")
    db.delete(item)
    commit_delete_or_raise(db, "Cannot delete batch because it is linked to other records.")

